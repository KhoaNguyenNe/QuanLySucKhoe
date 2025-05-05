from django.contrib import admin
from .models import User, HealthProfile, Plan, HealthJournal

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


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'plan_type', 'created_at')
    list_filter = ('plan_type',)


@admin.register(HealthJournal)
class HealthJournalAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'content')
