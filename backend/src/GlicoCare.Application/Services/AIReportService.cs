using AutoMapper;
using GlicoCare.Application.DTOs.AIReports;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Services;

public class AIReportService : IAIReportService
{
    private readonly IAIReportRepository _reportRepository;
    private readonly IGlucoseMeasurementRepository _measurementRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IDoctorRepository _doctorRepository;
    private readonly IAiAnalysisService _analysisService;
    private readonly IMapper _mapper;

    public AIReportService(
        IAIReportRepository reportRepository,
        IGlucoseMeasurementRepository measurementRepository,
        IPatientRepository patientRepository,
        IDoctorRepository doctorRepository,
        IAiAnalysisService analysisService,
        IMapper mapper)
    {
        _reportRepository = reportRepository;
        _measurementRepository = measurementRepository;
        _patientRepository = patientRepository;
        _doctorRepository = doctorRepository;
        _analysisService = analysisService;
        _mapper = mapper;
    }

    public async Task<AIReportDto?> GetLatestAsync(Guid patientId, AIReportType period, Guid requestingUserId, string role, CancellationToken cancellationToken = default)
    {
        await EnsureCanAccessAsync(patientId, requestingUserId, role, cancellationToken);

        var report = await _reportRepository.GetLatestByPatientAndTypeAsync(patientId, period, cancellationToken);
        return report is null ? null : _mapper.Map<AIReportDto>(report);
    }

    public async Task<AIReportDto> GenerateAsync(Guid patientId, AIReportType period, Guid requestingUserId, string role, CancellationToken cancellationToken = default)
    {
        await EnsureCanAccessAsync(patientId, requestingUserId, role, cancellationToken);
        return await GenerateForPatientAsync(patientId, period, cancellationToken);
    }

    public async Task<AIReportDto> GenerateForPatientAsync(Guid patientId, AIReportType period, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(patientId, cancellationToken)
            ?? throw new NotFoundException("Utente não encontrado.");

        var allMeasurements = await _measurementRepository.GetByPatientIdAsync(patientId, cancellationToken);

        var now = DateTime.UtcNow;
        var (currentStart, previousStart, previousEnd) = GetWindow(period, now);

        var current = allMeasurements.Where(m => m.MeasuredAt >= currentStart && m.MeasuredAt <= now).ToList();
        var previous = allMeasurements.Where(m => m.MeasuredAt >= previousStart && m.MeasuredAt < previousEnd).ToList();

        var (summary, recommendations) = _analysisService.Analyze(patient, period, current, previous);

        var today = now.Date;
        var existing = await _reportRepository.GetByPatientTypeAndDateAsync(patientId, period, today, cancellationToken);

        if (existing is not null)
        {
            existing.Summary = summary;
            existing.Recommendations = recommendations;
            existing.ReferenceDate = today;
            _reportRepository.Update(existing);
            await _reportRepository.SaveChangesAsync(cancellationToken);
            return _mapper.Map<AIReportDto>(existing);
        }

        var report = new AIReport
        {
            PatientId = patientId,
            Type = period,
            Summary = summary,
            Recommendations = recommendations,
            ReferenceDate = today
        };

        await _reportRepository.AddAsync(report, cancellationToken);
        await _reportRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<AIReportDto>(report);
    }

    private static (DateTime CurrentStart, DateTime PreviousStart, DateTime PreviousEnd) GetWindow(AIReportType period, DateTime now)
    {
        return period switch
        {
            AIReportType.Daily => (now.Date, now.Date.AddDays(-1), now.Date),
            AIReportType.Weekly => (now.Date.AddDays(-7), now.Date.AddDays(-14), now.Date.AddDays(-7)),
            AIReportType.Monthly => (now.Date.AddDays(-30), now.Date.AddDays(-60), now.Date.AddDays(-30)),
            _ => (now.Date, now.Date.AddDays(-1), now.Date)
        };
    }

    private async Task EnsureCanAccessAsync(Guid patientId, Guid requestingUserId, string role, CancellationToken cancellationToken)
    {
        if (role == RoleType.Patient.ToString())
        {
            var patient = await _patientRepository.GetByUserIdAsync(requestingUserId, cancellationToken);
            if (patient is null || patient.Id != patientId)
            {
                throw new ForbiddenException("Só pode consultar as suas próprias análises.");
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
                throw new ForbiddenException("Só pode consultar análises de utentes que lhe estejam associados.");
            }
            return;
        }

        throw new ForbiddenException("Sem permissão para aceder a análises clínicas.");
    }
}
