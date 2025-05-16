from django.contrib import admin
from .models import User, HealthProfile, Exercise, TrainingSchedule, TrainingSession, NutritionPlan, Reminder, ChatMessage, HealthJournal


# Tùy chỉnh tiêu đề và các thông tin trang quản trị
admin.site.site_header = "Hệ Thống Quản Lý Sức Khỏe"
admin.site.site_title = "Trang Quản Trị Sức Khỏe"
admin.site.index_title = "Quản lý thông tin và hoạt động"

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_active')
    list_filter = ('role', 'is_active')
    search_fields = ('username', 'email')

@admin.register(HealthProfile)
class HealthProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'bmi', 'water_intake', 'steps', 'heart_rate')

@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'duration', 'calories_burned')

@admin.register(TrainingSchedule)
class TrainingScheduleAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'time', 'created_at')

@admin.register(TrainingSession)
class TrainingSessionAdmin(admin.ModelAdmin):
    list_display = ('schedule', 'exercise', 'custom_exercise_name', 'repetitions', 'duration', 'feedback')

@admin.register(NutritionPlan)
class NutritionPlanAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'description', 'created_at')

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('user', 'reminder_type', 'time', 'message')

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'content', 'timestamp')

@admin.register(HealthJournal)
class HealthJournalAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'content')
