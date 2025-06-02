from rest_framework import viewsets, permissions, status, parsers
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from .models import User, HealthProfile, Exercise, TrainingSchedule, TrainingSession, NutritionPlan, Reminder, ChatMessage, HealthJournal, PasswordResetOTP
from .serializers import (
    UserSerializer, HealthProfileSerializer, ExerciseSerializer, TrainingScheduleSerializer,
    TrainingSessionSerializer, NutritionPlanSerializer, ReminderSerializer, ChatMessageSerializer, HealthJournalSerializer,
    RegisterSerializer
)
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.decorators import action
from .permissions import IsOwnerOrReadOnly, IsExpert, IsOwnerOrExpert
import random
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import models

# User ViewSet (chỉ đăng ký, lấy/cập nhật profile)
class UserViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "Đăng ký thành công", "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get', 'put'], permission_classes=[permissions.IsAuthenticated])
    def profile(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = UserSerializer(user)
            # Lấy health profile nếu có
            try:
                health_profile = user.health_profile
                health_serializer = HealthProfileSerializer(health_profile)
                health_data = health_serializer.data
            except HealthProfile.DoesNotExist:
                health_data = None
            # Thống kê nhanh
            now = timezone.now().date()
            week_ago = now - timedelta(days=7)
            week_sessions = TrainingSession.objects.filter(schedule__user=user, schedule__date__gte=week_ago).count()
            reminders = Reminder.objects.filter(user=user).count()
            unread_messages = ChatMessage.objects.filter(receiver=user, is_read=False).count()
            response_data = {
                'user': serializer.data,
                'health_profile': health_data,
                'statistics': {
                    'weekly_sessions': week_sessions,
                    'total_reminders': reminders,
                    'unread_messages': unread_messages
                }
            }
            return Response(response_data, status=status.HTTP_200_OK)
        elif request.method == 'PUT':
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'user': serializer.data}, status=200)
            return Response(serializer.errors, status=400)

# Health Profile ViewSet (lấy/cập nhật hồ sơ sức khỏe)
class HealthProfileViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrExpert]
    def retrieve(self, request, user_id=None):
        profile = HealthProfile.objects.filter(user_id=user_id).first()
        if profile:
            serializer = HealthProfileSerializer(profile)
            return Response(serializer.data, status = status.HTTP_200_OK)
        return Response({"detail": "Not found."}, status=404)
    def update(self, request, user_id=None):
        profile = HealthProfile.objects.filter(user_id=user_id).first()
        if not profile:
            return Response({"detail": "Not found."}, status=404)
        serializer = HealthProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)

# Exercise ViewSet (chỉ list, retrieve)
class ExerciseViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser]
    def list(self, request):
        # Bài tập hệ thống hoặc bài tập cá nhân của user
        exercises = Exercise.objects.filter(
            models.Q(is_custom=False) | (models.Q(is_custom=True) & models.Q(user=request.user))
        )
        serializer = ExerciseSerializer(exercises, many=True)
        return Response(serializer.data)
    def retrieve(self, request, pk=None):
        exercise = Exercise.objects.filter(pk=pk).first()
        if not exercise:
            return Response({"detail": "Not found."}, status=404)
        # Chỉ cho phép xem bài tập hệ thống hoặc bài tập cá nhân của mình
        if exercise.is_custom and exercise.user != request.user:
            return Response({"detail": "Permission denied."}, status=403)
        serializer = ExerciseSerializer(exercise)
        return Response(serializer.data)
    def create(self, request):
        # Chỉ cho phép user tạo bài tập cá nhân
        data = request.data.copy()
        data['is_custom'] = True
        serializer = ExerciseSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user, is_custom=True)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    def update(self, request, pk=None):
        exercise = Exercise.objects.filter(pk=pk, user=request.user, is_custom=True).first()
        if not exercise:
            return Response({"detail": "Not found or permission denied."}, status=404)
        serializer = ExerciseSerializer(exercise, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    def destroy(self, request, pk=None):
        exercise = Exercise.objects.filter(pk=pk, user=request.user, is_custom=True).first()
        if not exercise:
            return Response({"detail": "Not found or permission denied."}, status=404)
        exercise.delete()
        return Response(status=204)

# Training Schedule ViewSet (list, create, retrieve)
class TrainingScheduleViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrReadOnly]
    def list(self, request):
        schedules = TrainingSchedule.objects.filter(user=request.user)
        serializer = TrainingScheduleSerializer(schedules, many=True)
        return Response(serializer.data)
    def create(self, request):
        serializer = TrainingScheduleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    def retrieve(self, request, pk=None):
        schedule = TrainingSchedule.objects.filter(pk=pk, user=request.user).first()
        if not schedule:
            return Response({"detail": "Not found."}, status=404)
        serializer = TrainingScheduleSerializer(schedule)
        return Response(serializer.data)

# Training Session ViewSet (list, create, retrieve, add feedback)
class TrainingSessionViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrReadOnly]
    parser_classes = [parsers.MultiPartParser]
    def list(self, request):
        sessions = TrainingSession.objects.filter(schedule__user=request.user)
        serializer = TrainingSessionSerializer(sessions, many=True)
        return Response(serializer.data)
    def create(self, request):
        serializer = TrainingSessionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    def retrieve(self, request, pk=None):
        session = TrainingSession.objects.filter(pk=pk, schedule__user=request.user).first()
        if not session:
            return Response({"detail": "Not found."}, status=404)
        serializer = TrainingSessionSerializer(session)
        return Response(serializer.data)
    def update(self, request, pk=None):
        session = TrainingSession.objects.filter(pk=pk, schedule__user=request.user).first()
        if not session:
            return Response({"detail": "Not found."}, status=404)
        serializer = TrainingSessionSerializer(session, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    @action(detail=True, methods=['post'])
    def add_feedback(self, request, pk=None):
        session = TrainingSession.objects.filter(pk=pk, schedule__user=request.user).first()
        feedback = request.data.get('feedback')
        if session and feedback:
            session.feedback = feedback
            session.save()
            return Response({'detail': 'Feedback saved.'}, status=200)
        return Response({'detail': 'Feedback is required or session not found.'}, status=400)

# Nutrition Plan ViewSet (list theo user)
class NutritionPlanViewSet(viewsets.ViewSet):
    permission_classes = [IsExpert]
    def list(self, request, user_id=None):
        plans = NutritionPlan.objects.filter(user_id=user_id)
        serializer = NutritionPlanSerializer(plans, many=True)
        return Response(serializer.data, status = status.HTTP_200_OK)

# Reminder ViewSet (CRUD)
class ReminderViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrReadOnly]
    def list(self, request):
        reminders = Reminder.objects.filter(user=request.user)
        serializer = ReminderSerializer(reminders, many=True)
        return Response(serializer.data)
    def create(self, request):
        serializer = ReminderSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    def retrieve(self, request, pk=None):
        reminder = Reminder.objects.filter(pk=pk, user=request.user).first()
        if not reminder:
            return Response({"detail": "Not found."}, status=404)
        serializer = ReminderSerializer(reminder)
        return Response(serializer.data)
    def update(self, request, pk=None):
        reminder = Reminder.objects.filter(pk=pk, user=request.user).first()
        if not reminder:
            return Response({"detail": "Not found."}, status=404)
        serializer = ReminderSerializer(reminder, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    def destroy(self, request, pk=None):
        reminder = Reminder.objects.filter(pk=pk, user=request.user).first()
        if not reminder:
            return Response({"detail": "Not found."}, status=404)
        reminder.delete()
        return Response(status=204)

# Chat Message ViewSet (list, create)
class ChatMessageViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    def list(self, request):
        messages = ChatMessage.objects.filter(sender=request.user) | ChatMessage.objects.filter(receiver=request.user)
        messages = messages.order_by('timestamp')
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)
    def create(self, request):
        serializer = ChatMessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(sender=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

# Health Journal ViewSet (list, create)
class HealthJournalViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrReadOnly]
    def list(self, request):
        journals = HealthJournal.objects.filter(user=request.user)
        serializer = HealthJournalSerializer(journals, many=True)
        return Response(serializer.data)
    def create(self, request):
        serializer = HealthJournalSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

# Các API custom giữ nguyên
class UserStatisticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, user_id=None):
        if request.user.role == 'user' and request.user.id != user_id:
            return Response({'detail': 'Permission denied.'}, status=403)
        now = timezone.now().date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        year_ago = now - timedelta(days=365)
        profile = HealthProfile.objects.filter(user_id=user_id).first()
        week_sessions = TrainingSession.objects.filter(schedule__user_id=user_id, schedule__date__gte=week_ago)
        month_sessions = TrainingSession.objects.filter(schedule__user_id=user_id, schedule__date__gte=month_ago)
        year_sessions = TrainingSession.objects.filter(schedule__user_id=user_id, schedule__date__gte=year_ago)
        def total_calories(sessions):
            return sum([s.exercise.calories_burned if s.exercise else 0 for s in sessions])
        data = {
            'profile': HealthProfileSerializer(profile).data if profile else None,
            'week': {
                'total_sessions': week_sessions.count(),
                'total_calories': total_calories(week_sessions),
            },
            'month': {
                'total_sessions': month_sessions.count(),
                'total_calories': total_calories(month_sessions),
            },
            'year': {
                'total_sessions': year_sessions.count(),
                'total_calories': total_calories(year_sessions),
            }
        }
        return Response(data, status=200)

class NutritionSuggestionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, user_id=None):
        if request.user.role == 'user' and request.user.id != user_id:
            return Response({'detail': 'Permission denied.'}, status=403)
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'detail': 'User not found.'}, status=404)
        goal = (user.health_goal or '').lower()
        if 'tăng cơ' in goal:
            suggestion = 'Ăn nhiều protein (thịt, cá, trứng, sữa), rau xanh, hạn chế tinh bột xấu.'
        elif 'giảm cân' in goal:
            suggestion = 'Ăn nhiều rau xanh, hạn chế tinh bột, ưu tiên thực phẩm ít calo, uống đủ nước.'
        elif 'duy trì' in goal or 'sức khỏe' in goal:
            suggestion = 'Ăn đa dạng, cân bằng các nhóm chất, duy trì chế độ ăn lành mạnh.'
        else:
            suggestion = 'Hãy nhập mục tiêu sức khỏe để nhận gợi ý thực đơn phù hợp.'
        return Response({'suggestion': suggestion}, status=200)

class ChatHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, user_id=None, expert_id=None):
        if request.user.role == 'user' and request.user.id != user_id:
            return Response({'detail': 'Permission denied.'}, status=403)
        if request.user.role == 'expert' and request.user.id != expert_id:
            return Response({'detail': 'Permission denied.'}, status=403)
        messages = ChatMessage.objects.filter(sender_id=user_id, receiver_id=expert_id) | ChatMessage.objects.filter(sender_id=expert_id, receiver_id=user_id)
        messages = messages.order_by('timestamp')
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data, status=200)

class FlexibleReminderView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        reminder_type = request.data.get('reminder_type')
        time = request.data.get('time')
        message = request.data.get('message')
        date = request.data.get('date')
        repeat_days = request.data.get('repeat_days')
        enabled = request.data.get('enabled', True)
        if not (reminder_type and time and message):
            return Response({'detail': 'Missing required fields.'}, status=400)
        reminder = Reminder.objects.create(
            user=request.user,
            reminder_type=reminder_type,
            date=date,
            time=time,
            message=message,
            repeat_days=repeat_days,
            enabled=enabled
        )
        return Response({'detail': 'Reminder created.', 'reminder_id': reminder.id}, status=201)

class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email là bắt buộc'}, status=400)
        otp = str(random.randint(100000, 999999))
        PasswordResetOTP.objects.create(email=email, otp=otp)
        send_mail(
            'Mã OTP đặt lại mật khẩu',
            f'Mã OTP của bạn là: {otp}',
            'no-reply@yourdomain.com',
            [email],
        )
        return Response({'message': 'OTP đã được gửi về email'}, status=200)

class ConfirmOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')
        if not all([email, otp, new_password]):
            return Response({'error': 'Thiếu thông tin'}, status=400)
        try:
            otp_obj = PasswordResetOTP.objects.filter(email=email, otp=otp, is_used=False).latest('created_at')
        except PasswordResetOTP.DoesNotExist:
            return Response({'error': 'OTP không hợp lệ'}, status=400)
        if timezone.now() - otp_obj.created_at > timedelta(minutes=10):
            return Response({'error': 'OTP đã hết hạn'}, status=400)
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
            user.set_password(new_password)
            user.save()
            otp_obj.is_used = True
            otp_obj.save()
            return Response({'message': 'Đổi mật khẩu thành công'}, status=200)
        except User.DoesNotExist:
            return Response({'error': 'Không tìm thấy user'}, status=404)

class GoogleLoginAPIView(APIView):
    def post(self, request):
        token = request.data.get('access_token')
        try:
            idinfo = id_token.verify_oauth2_token(token, requests.Request())
            email = idinfo['email']
            user, created = User.objects.get_or_create(email=email)
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)