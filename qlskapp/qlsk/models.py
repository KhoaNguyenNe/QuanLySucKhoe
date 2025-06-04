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
    bmi = models.FloatField(null=True, blank=True)  # Chỉ số BMI
    expert = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='clients'
    )

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


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

class WaterSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="water_sessions")
    date = models.DateField()
    time = models.TimeField(auto_now_add=True)
    amount = models.FloatField()  # Đơn vị: lít

    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.amount}L"

class DietGoal(models.Model):
    GOAL_CHOICES = [
        ('muscle_gain', 'Tăng cơ'),
        ('weight_loss', 'Giảm cân'),
        ('maintenance', 'Duy trì sức khỏe'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="diet_goals")
    goal_type = models.CharField(max_length=1024, choices=GOAL_CHOICES)
    target_weight = models.FloatField(null=True, blank=True)  # Cân nặng mục tiêu
    target_date = models.DateField(null=True, blank=True)  # Ngày đạt mục tiêu
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username}'s {self.get_goal_type_display()} goal"

class MealPlan(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="meal_plans")
    diet_goal = models.ForeignKey(DietGoal, on_delete=models.CASCADE, related_name="meal_plans")
    title = models.CharField(max_length=1024)
    description = models.TextField()
    total_calories = models.IntegerField()
    protein = models.FloatField()  # gram
    carbs = models.FloatField()    # gram
    fat = models.FloatField()      # gram
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.title} for {self.user.username}"

class Meal(models.Model):
    MEAL_TYPE_CHOICES = [
        ('breakfast', 'Bữa sáng'),
        ('lunch', 'Bữa trưa'),
        ('dinner', 'Bữa tối'),
        ('snack', 'Bữa phụ'),
    ]

    meal_plan = models.ForeignKey(MealPlan, on_delete=models.CASCADE, related_name="meals")
    meal_type = models.CharField(max_length=1024, choices=MEAL_TYPE_CHOICES)
    name = models.CharField(max_length=1024)
    description = models.TextField()
    calories = models.IntegerField()
    protein = models.FloatField()  # gram
    carbs = models.FloatField()    # gram
    fat = models.FloatField()      # gram
    ingredients = models.TextField()  # Danh sách nguyên liệu
    instructions = models.TextField()  # Hướng dẫn chế biến
    image = CloudinaryField('image', blank=True, null=True)

    def __str__(self):
        return f"{self.get_meal_type_display()}: {self.name}"