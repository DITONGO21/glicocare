using AutoMapper;
using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.GlucoseMeasurements;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Services;

public class GlucoseMeasurementService : IGlucoseMeasurementService
{
    private readonly IGlucoseMeasurementRepository _measurementRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IDoctorRepository _doctorRepository;
    private readonly IAIReportService _aiReportService;
    private readonly IMapper _mapper;
    private static readonly Random Random = new();

    public GlucoseMeasurementService(
        IGlucoseMeasurementRepository measurementRepository,
        IPatientRepository patientRepository,
        IDoctorRepository doctorRepository,
        IAIReportService aiReportService,
        IMapper mapper)
    {
        _measurementRepository = measurementRepository;
        _patientRepository = patientRepository;
        _doctorRepository = doctorRepository;
        _aiReportService = aiReportService;
        _mapper = mapper;
    }

    public async Task<GlucoseMeasurementDto> GetByIdAsync(Guid id, Guid requestingUserId, string role, CancellationToken cancellationToken = default)
    {
        var measurement = await _measurementRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Medição não encontrada.");

        await EnsureCanReadAsync(measurement.PatientId, requestingUserId, role, cancellationToken);

        return _mapper.Map<GlucoseMeasurementDto>(measurement);
    }

    public async Task<PagedResult<GlucoseMeasurementDto>> GetHistoryAsync(
        Guid patientId, DateTime? from, DateTime? to, int page, int pageSize,
        Guid requestingUserId, string role, CancellationToken cancellationToken = default)
    {
        await EnsureCanReadAsync(patientId, requestingUserId, role, cancellationToken);

        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 50 : pageSize;

        var (items, totalCount) = await _measurementRepository.GetHistoryAsync(patientId, from, to, page, pageSize, cancellationToken);

        return new PagedResult<GlucoseMeasurementDto>
        {
            Items = _mapper.Map<IReadOnlyList<GlucoseMeasurementDto>>(items),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<GlucoseMeasurementDto> CreateAsync(CreateGlucoseMeasurementRequest request, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByUserIdAsync(requestingUserId, cancellationToken)
            ?? throw new ForbiddenException("Apenas o próprio utente pode registar as suas medições.");

        if (patient.Id != request.PatientId)
        {
            throw new ForbiddenException("Só pode registar medições em seu próprio nome.");
        }

        var measurement = new GlucoseMeasurement
        {
            PatientId = patient.Id,
            ValueMgDl = request.ValueMgDl,
            MeasuredAt = request.MeasuredAt,
            Source = request.Source,
            Notes = request.Notes,
            AlertStatus = ComputeAlertStatus(request.ValueMgDl, patient.TargetGlucoseMin, patient.TargetGlucoseMax)
        };

        await _measurementRepository.AddAsync(measurement, cancellationToken);
        await _measurementRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<GlucoseMeasurementDto>(measurement);
    }

    public async Task<GlucoseMeasurementDto> UpdateAsync(Guid id, UpdateGlucoseMeasurementRequest request, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var measurement = await _measurementRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Medição não encontrada.");

        var patient = await _patientRepository.GetByUserIdAsync(requestingUserId, cancellationToken);
        if (patient is null || patient.Id != measurement.PatientId)
        {
            throw new ForbiddenException("Só pode editar as suas próprias medições.");
        }

        measurement.ValueMgDl = request.ValueMgDl;
        measurement.MeasuredAt = request.MeasuredAt;
        measurement.Source = request.Source;
        measurement.Notes = request.Notes;
        measurement.AlertStatus = ComputeAlertStatus(request.ValueMgDl, patient.TargetGlucoseMin, patient.TargetGlucoseMax);

        _measurementRepository.Update(measurement);
        await _measurementRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<GlucoseMeasurementDto>(measurement);
    }

    public async Task DeleteAsync(Guid id, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var measurement = await _measurementRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Medição não encontrada.");

        var patient = await _patientRepository.GetByUserIdAsync(requestingUserId, cancellationToken);
        if (patient is null || patient.Id != measurement.PatientId)
        {
            throw new ForbiddenException("Só pode remover as suas próprias medições.");
        }

        measurement.IsDeleted = true;
        _measurementRepository.Update(measurement);
        await _measurementRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<GlucoseMeasurementDto> SimulateEsp32Async(Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByUserIdAsync(requestingUserId, cancellationToken)
            ?? throw new ForbiddenException("Apenas o próprio utente pode simular medições.");

        var value = GenerateSimulatedValue();

        var measurement = new GlucoseMeasurement
        {
            PatientId = patient.Id,
            ValueMgDl = value,
            MeasuredAt = DateTime.UtcNow,
            Source = MeasurementSource.ESP32Simulado,
            Notes = "Medição gerada automaticamente pela simulação do sensor ESP32.",
            AlertStatus = ComputeAlertStatus(value, patient.TargetGlucoseMin, patient.TargetGlucoseMax)
        };

        await _measurementRepository.AddAsync(measurement, cancellationToken);
        await _measurementRepository.SaveChangesAsync(cancellationToken);

        // Trigger the (simulated, rule-based) AI analysis so the dashboard reflects the new reading immediately.
        await _aiReportService.GenerateForPatientAsync(patient.Id, AIReportType.Daily, cancellationToken);

        return _mapper.Map<GlucoseMeasurementDto>(measurement);
    }

    public async Task<GlucoseMeasurementDto> UpdateAlertStatusAsync(Guid id, AlertStatus alertStatus, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var measurement = await _measurementRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Medição não encontrada.");

        var doctor = await _doctorRepository.GetByUserIdAsync(requestingUserId, cancellationToken)
            ?? throw new ForbiddenException("Médico não encontrado.");

        var isAssigned = await _patientRepository.IsPatientAssignedToDoctorAsync(measurement.PatientId, doctor.Id, cancellationToken);
        if (!isAssigned)
        {
            throw new ForbiddenException("Só pode atualizar alertas de utentes que lhe estejam associados.");
        }

        measurement.AlertStatus = alertStatus;
        _measurementRepository.Update(measurement);
        await _measurementRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<GlucoseMeasurementDto>(measurement);
    }

    /// <summary>
    /// Weighted random glucose value: ~70% within normal range, ~15% high, ~15% low, always
    /// clamped to a physiologically plausible range (40-300 mg/dL). Pure software simulation -
    /// no real sensor/hardware is involved.
    /// </summary>
    private static double GenerateSimulatedValue()
    {
        var roll = Random.NextDouble();
        return roll switch
        {
            < 0.70 => Math.Round(70 + Random.NextDouble() * (180 - 70), 0),   // normal: 70-180
            < 0.85 => Math.Round(181 + Random.NextDouble() * (300 - 181), 0), // high: 181-300
            _ => Math.Round(40 + Random.NextDouble() * (69 - 40), 0)         // low: 40-69
        };
    }

    private async Task EnsureCanReadAsync(Guid patientId, Guid requestingUserId, string role, CancellationToken cancellationToken)
    {
        if (role == RoleType.Patient.ToString())
        {
            var patient = await _patientRepository.GetByUserIdAsync(requestingUserId, cancellationToken);
            if (patient is null || patient.Id != patientId)
            {
                throw new ForbiddenException("Só pode consultar as suas próprias medições.");
            }
            return;
        }

        if (role == RoleType.Doctor.ToString())
        {
            var doctor = await _doctorRepository.GetByUserIdAsync(requestingUserId, cancellationToken)
                ?? throw new ForbiddenException("Médico não encontrado.");

            var isAssigned = await _patientRepository.IsPatientAssignedToDoctorAsync(patientId, doctor.Id, cancellationToken);
            if (!isAssigned)
            {
                throw new ForbiddenException("Só pode consultar medições de utentes que lhe estejam associados.");
            }
            return;
        }

        throw new ForbiddenException("Sem permissão para aceder a dados clínicos.");
    }

    private static AlertStatus ComputeAlertStatus(double value, double? min, double? max)
    {
        var outOfRange = (min.HasValue && value < min.Value) || (max.HasValue && value > max.Value);
        return outOfRange ? AlertStatus.UnderObservation : AlertStatus.None;
    }
}
