from rest_framework import serializers
from .models import User, HealthProfile, Exercise, TrainingSchedule, TrainingSession, NutritionPlan, Reminder, ChatMessage, HealthJournal

# User Serializer
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'height', 'weight', 'age', 'health_goal']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        instance = self.Meta.model(**validated_data)
        if password is not None:
            instance.set_password(password)
        instance.save()
        return instance

# Health Profile Serializer
class HealthProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthProfile
        fields = ['id', 'bmi', 'water_intake', 'steps', 'heart_rate']

# Exercise Serializer
class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ['id', 'name', 'description', 'duration', 'calories_burned']

# Training Schedule Serializer
class TrainingScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingSchedule
        fields = ['id', 'user', 'date', 'time', 'created_at']

# Training Session Serializer
class TrainingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingSession
        fields = ['id', 'schedule', 'exercise', 'custom_exercise_name', 'repetitions', 'duration', 'feedback']

# Nutrition Plan Serializer
class NutritionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionPlan
        fields = ['id', 'user', 'title', 'description', 'created_at']

# Reminder Serializer
class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = ['id', 'user', 'reminder_type', 'time', 'message']

# Chat Message Serializer
class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'receiver', 'content', 'timestamp']

# Health Journal Serializer
class HealthJournalSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthJournal
        fields = ['id', 'user', 'date', 'content']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'role']
        extra_kwargs = {
            'email': {'required': True},
            'role': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Mật khẩu không khớp"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user