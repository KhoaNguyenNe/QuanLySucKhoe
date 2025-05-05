from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import User, HealthProfile, Exercise, TrainingSchedule, TrainingSession, NutritionPlan, Reminder, ChatMessage, HealthJournal
from .serializers import (
    UserSerializer, HealthProfileSerializer, ExerciseSerializer, TrainingScheduleSerializer,
    TrainingSessionSerializer, NutritionPlanSerializer, ReminderSerializer, ChatMessageSerializer, HealthJournalSerializer
)

# User ViewSet
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

# Health Profile ViewSet
class HealthProfileViewSet(viewsets.ViewSet):
    #Phương thức chỉ xử lý GET
    def retrieve(self, request, user_id=None):
        profile = HealthProfile.objects.filter(user_id=user_id).first()
        if profile:
            serializer = HealthProfileSerializer(profile)
            return Response(serializer.data, status = status.HTTP_200_OK)
        return Response({"detail": "Not found."}, status=404)


# Exercise ViewSet
class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]

# Training Schedule ViewSet
class TrainingScheduleViewSet(viewsets.ModelViewSet):
    queryset = TrainingSchedule.objects.all()
    serializer_class = TrainingScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

# Training Session ViewSet
class TrainingSessionViewSet(viewsets.ModelViewSet):
    queryset = TrainingSession.objects.all()
    serializer_class = TrainingSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

# Nutrition Plan ViewSet
class NutritionPlanViewSet(viewsets.ViewSet):
    def list(self, request, user_id=None):
        plans = NutritionPlan.objects.filter(user_id=user_id)
        serializer = NutritionPlanSerializer(plans, many=True)
        return Response(serializer.data, status = status.HTTP_200_OK)

# Reminder ViewSet
class ReminderViewSet(viewsets.ModelViewSet):
    queryset = Reminder.objects.all()
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

# Chat Message ViewSet
class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

# Health Journal ViewSet
class HealthJournalViewSet(viewsets.ViewSet):
    def list(self, request, user_id=None):
        journals = HealthJournal.objects.filter(user_id=user_id)
        serializer = HealthJournalSerializer(journals, many=True)
        return Response(serializer.data, status = status.HTTP_200_OK)