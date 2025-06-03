from ckeditor.fields import RichTextField
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth import get_user_model
from cloudinary.models import CloudinaryField

# Custom User Model
class User(AbstractUser):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('expert', 'Nutritionist/Trainer'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    email = models.EmailField(unique=True, verbose_name='email address')
    height = models.FloatField(null=True, blank=True)  # Chiều cao (cm)
    weight = models.FloatField(null=True, blank=True)  # Cân nặng (kg)
    age = models.IntegerField(null=True, blank=True)  # Tuổi
    health_goal = models.TextField(null=True, blank=True)  # Mục tiêu sức khỏe

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


# Health Profile Model
class HealthProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="health_profile")
    bmi = models.FloatField(null=True, blank=True)  # Chỉ số BMI
    water_intake = models.FloatField(default=0)  # Lượng nước uống (lít)
    steps = models.IntegerField(default=0)  # Số bước đi
    heart_rate = models.IntegerField(null=True, blank=True)  # Nhịp tim

    def __str__(self):
        return f"Health Profile of {self.user.username}"


# Exercise Model (Danh sách bài tập gợi ý)
class Exercise(models.Model):
    name = models.CharField(max_length=255)  # Tên bài tập
    description = models.TextField()  # Mô tả bài tập
    repetitions = models.IntegerField(null=True, blank=True)  # Số lần lặp
    duration = models.IntegerField()  # Thời gian gợi ý (phút)
    calories_burned = models.IntegerField()  # Lượng calo tiêu thụ gợi ý
    is_custom = models.BooleanField(default=False)  # True nếu là bài tập cá nhân
    user = models.ForeignKey('User', on_delete=models.CASCADE, null=True, blank=True, related_name='custom_exercises')  # User tạo bài tập cá nhân
    image = CloudinaryField('image', blank=True, null=True)  # Ảnh bài tập gợi ý hoặc cá nhân

    def __str__(self):
        return self.name


# Training Schedule Model (Lịch tập luyện cá nhân)
class TrainingSchedule(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="training_schedules")
    date = models.DateField()  # Ngày tập luyện
    time = models.TimeField()  # Giờ tập luyện
    created_at = models.DateTimeField(auto_now_add=True)  # Thời gian tạo lịch

    def __str__(self):
        return f"Schedule for {self.user.username} on {self.date}"


# Training Session Model (Chi tiết buổi tập trong lịch)
class TrainingSession(models.Model):
    schedule = models.ForeignKey(TrainingSchedule, on_delete=models.CASCADE, related_name="sessions")
    exercise = models.ForeignKey(Exercise, on_delete=models.SET_NULL, null=True, blank=True)  # Bài tập gợi ý
    custom_exercise_name = models.CharField(max_length=255, null=True, blank=True)  # Bài tập tự thêm
    repetitions = models.IntegerField(null=True, blank=True)  # Số lần lặp
    duration = models.IntegerField(null=True, blank=True)  # Thời gian thực hiện (phút)
    feedback = models.TextField(null=True, blank=True) 
    image = models.ImageField(upload_to="training_sessions/%Y/%m/", null=True, blank=True)  # Ảnh bài tập tự thêm

    def __str__(self):
        return f"Session in {self.schedule} - {self.exercise or self.custom_exercise_name}"


# Nutrition Plan Model
class NutritionPlan(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="nutrition_plans")
    title = models.CharField(max_length=100)  # Tên thực đơn
    description = models.TextField()  # Mô tả thực đơn
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Nutrition Plan: {self.title} for {self.user.username}"


# Reminder Model
class Reminder(models.Model):
    REMINDER_TYPE_CHOICES = [
        ('water', 'Drink Water'),
        ('exercise', 'Exercise'),
        ('rest', 'Rest'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reminders")
    reminder_type = models.CharField(max_length=10, choices=REMINDER_TYPE_CHOICES)
    date = models.DateField(null=True, blank=True)  # Ngày nhắc nhở, có thể null nếu lặp lại hằng ngày
    time = models.TimeField()  # Thời gian nhắc nhở
    message = models.CharField(max_length=255)  # Nội dung nhắc nhở
    repeat_days = models.CharField(max_length=50, null=True, blank=True, help_text="Lưu JSON các thứ trong tuần, ví dụ: [\"T2\", \"T3\", \"T5\"]")
    enabled = models.BooleanField(default=True, help_text="Bật/tắt nhắc nhở")

    def __str__(self):
        return f"Reminder for {self.user.username}: {self.get_reminder_type_display()} at {self.time}"


# Chat Message Model
class ChatMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    content = models.TextField()  # Nội dung tin nhắn
    timestamp = models.DateTimeField(auto_now_add=True)  # Thời gian gửi tin nhắn
    is_read = models.BooleanField(default=False)  # Trạng thái đã đọc

    def __str__(self):
        return f"Message from {self.sender.username} to {self.receiver.username} at {self.timestamp}"


# Health Journal Model
class HealthJournal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="journals")
    date = models.DateField(auto_now_add=True)
    content = RichTextField()
    workout_session = models.ForeignKey('WorkoutSession', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Journal Entry for {self.user.username} on {self.date}"


class PasswordResetOTP(models.Model):
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

# Workout Session Model (Lưu trữ quá trình tập luyện theo thời gian thực)
class WorkoutSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="workout_sessions")
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    total_calories = models.IntegerField(default=0)
    exercises = models.ManyToManyField(Exercise, through='WorkoutExercise')
    is_completed = models.BooleanField(default=False)

    def __str__(self):
        username = self.user.username if self.user else "Unknown User"
        start_time_str = self.start_time.strftime("%Y-%m-%d %H:%M:%S") if self.start_time else "Unknown Time"
        return f"Workout Session of {username} at {start_time_str}"

# Workout Exercise Model (Lưu trữ chi tiết bài tập trong buổi tập)
class WorkoutExercise(models.Model):
    workout_session = models.ForeignKey(WorkoutSession, on_delete=models.CASCADE)
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.SET_NULL,  # Khi xóa Exercise, trường này sẽ thành NULL
        null=True,
        blank=True,
        related_name="workout_exercises"
    )
    duration = models.IntegerField(default=0)  # Thời gian thực hiện (giây)
    calories_burned = models.IntegerField(default=0)  # Calo tiêu thụ thực tế
    completed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        try:
            if not hasattr(self, 'exercise') or not self.exercise:
                return f"WorkoutExercise {self.id}"
            if not hasattr(self, 'workout_session') or not self.workout_session:
                return f"Exercise {self.exercise.name}"
            return f"{self.exercise.name} in {self.workout_session}"
        except Exception:
            return f"WorkoutExercise {self.id}"

class HealthMetricsHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="health_metrics_history")
    date = models.DateField(auto_now_add=True)
    time = models.TimeField(auto_now_add=True)
    water_intake = models.FloatField(default=0)  # Lượng nước uống (lít)
    steps = models.IntegerField(default=0)  # Số bước đi
    heart_rate = models.IntegerField(null=True, blank=True)  # Nhịp tim

    class Meta:
        ordering = ['-date', '-time']

    def __str__(self):
        return f"Health metrics of {self.user.username} at {self.date} {self.time}"