using AutoMapper;
using GlicoCare.Application.DTOs.AIReports;
using GlicoCare.Application.DTOs.Associations;
using GlicoCare.Application.DTOs.Conversations;
using GlicoCare.Application.DTOs.Doctors;
using GlicoCare.Application.DTOs.GlucoseMeasurements;
using GlicoCare.Application.DTOs.MedicalNotes;
using GlicoCare.Application.DTOs.Patients;
using GlicoCare.Application.DTOs.Users;
using GlicoCare.Domain.Entities;

namespace GlicoCare.Application.Mappings;

/// <summary>
/// Central AutoMapper configuration. Kept in a single profile for this phase since the
/// entity graph is small; can be split per-module as the project grows.
/// </summary>
public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<User, UserDto>();

        CreateMap<Doctor, DoctorDto>()
            .ForMember(d => d.FullName, opt => opt.MapFrom(s => s.User.FullName))
            .ForMember(d => d.Email, opt => opt.MapFrom(s => s.User.Email));

        CreateMap<Patient, PatientDto>()
            .ForMember(d => d.FullName, opt => opt.MapFrom(s => s.User.FullName))
            .ForMember(d => d.Email, opt => opt.MapFrom(s => s.User.Email));

        CreateMap<GlucoseMeasurement, GlucoseMeasurementDto>();

        CreateMap<DoctorPatient, AssociationDto>()
            .ForMember(d => d.DoctorName, opt => opt.MapFrom(s => s.Doctor.User.FullName))
            .ForMember(d => d.PatientName, opt => opt.MapFrom(s => s.Patient.User.FullName));

        CreateMap<MedicalNote, MedicalNoteDto>()
            .ForMember(d => d.DoctorName, opt => opt.MapFrom(s => s.Doctor.User.FullName));

        CreateMap<Conversation, ConversationDto>()
            .ForMember(d => d.DoctorName, opt => opt.MapFrom(s => s.Doctor.User.FullName))
            .ForMember(d => d.PatientName, opt => opt.MapFrom(s => s.Patient.User.FullName))
            .ForMember(d => d.UnreadCount, opt => opt.Ignore())
            .ForMember(d => d.LastMessagePreview, opt => opt.Ignore())
            .ForMember(d => d.LastMessageAt, opt => opt.Ignore());

        CreateMap<Message, MessageDto>();

        CreateMap<AIReport, AIReportDto>();
    }
}
