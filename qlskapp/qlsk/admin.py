from django.contrib import admin
from .models import User, Exercise, TrainingSchedule, TrainingSession, Reminder, HealthJournal, WorkoutSession, WorkoutExercise, HealthMetricsHistory, WaterSession, DietGoal, MealPlan, Meal


# Tùy chỉnh tiêu đề và các thông tin trang quản trị
admin.site.site_header = "Hệ Thống Quản Lý Sức Khỏe"
admin.site.site_title = "Trang Quản Trị Sức Khỏe"
admin.site.index_title = "Quản lý thông tin và hoạt động"

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'height', 'weight', 'age', 'bmi')
    search_fields = ('username', 'email')
    list_filter = ('role',)

@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('name', 'duration', 'calories_burned', 'is_custom', 'user')
    search_fields = ('name',)
    list_filter = ('is_custom',)

@admin.register(TrainingSchedule)
class TrainingScheduleAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'time')
    list_filter = ('date',)

@admin.register(TrainingSession)
class TrainingSessionAdmin(admin.ModelAdmin):
    list_display = ('schedule', 'exercise', 'custom_exercise_name', 'repetitions', 'duration')
    search_fields = ('custom_exercise_name',)

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('user', 'reminder_type', 'date', 'time', 'message', 'enabled')
    list_filter = ('reminder_type', 'enabled')

@admin.register(HealthJournal)
class HealthJournalAdmin(admin.ModelAdmin):
    list_display = ('user', 'date')
    list_filter = ('date',)

@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'start_time', 'end_time', 'total_calories', 'is_completed')
    list_filter = ('is_completed',)

@admin.register(WorkoutExercise)
class WorkoutExerciseAdmin(admin.ModelAdmin):
    list_display = ('workout_session', 'exercise', 'duration', 'calories_burned', 'completed_at')

@admin.register(HealthMetricsHistory)
class HealthMetricsHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'time', 'water_intake', 'steps', 'heart_rate')
    list_filter = ('date',)

@admin.register(WaterSession)
class WaterSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'time', 'amount')
    list_filter = ('date',)

@admin.register(DietGoal)
class DietGoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'goal_type', 'target_weight', 'target_date', 'created_at', 'is_active')
    list_filter = ('goal_type', 'is_active')

@admin.register(MealPlan)
class MealPlanAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'total_calories', 'created_at', 'is_active')
    list_filter = ('is_active',)

@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ('meal_plan', 'meal_type', 'name', 'calories')
    list_filter = ('meal_type',)
