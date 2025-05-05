from django.db import models
from django.contrib.auth.models import AbstractUser
from ckeditor.fields import RichTextField

# Custom User Model
class User(AbstractUser):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('expert', 'Nutritionist/Trainer'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
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


# Training and Nutrition Plan
class Plan(models.Model):
    PLAN_TYPE_CHOICES = [
        ('exercise', 'Exercise'),
        ('diet', 'Diet'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="plans")
    plan_type = models.CharField(max_length=10, choices=PLAN_TYPE_CHOICES)
    title = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_plan_type_display()}) for {self.user.username}"


# Health Journal
class HealthJournal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="journals")
    date = models.DateField(auto_now_add=True)
    content = RichTextField()

    def __str__(self):
        return f"Journal Entry for {self.user.username} on {self.date}"