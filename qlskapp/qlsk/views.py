from rest_framework import viewsets, permissions, status
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

# User ViewSet
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsOwnerOrReadOnly]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# Health Profile ViewSet
class HealthProfileViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrExpert]
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
    permission_classes = [IsOwnerOrReadOnly]

# Training Session ViewSet
class TrainingSessionViewSet(viewsets.ModelViewSet):
    queryset = TrainingSession.objects.all()
    serializer_class = TrainingSessionSerializer
    permission_classes = [IsOwnerOrReadOnly]

    @action(detail=True, methods=['post'])
    def add_feedback(self, request, pk=None):
        session = self.get_object()
        feedback = request.data.get('feedback')
        if feedback:
            session.feedback = feedback
            session.save()
            return Response({'detail': 'Feedback saved.'}, status=200)
        return Response({'detail': 'Feedback is required.'}, status=400)

# Nutrition Plan ViewSet
class NutritionPlanViewSet(viewsets.ViewSet):
    permission_classes = [IsExpert]
    def list(self, request, user_id=None):
        plans = NutritionPlan.objects.filter(user_id=user_id)
        serializer = NutritionPlanSerializer(plans, many=True)
        return Response(serializer.data, status = status.HTTP_200_OK)

# Reminder ViewSet
class ReminderViewSet(viewsets.ModelViewSet):
    queryset = Reminder.objects.all()
    serializer_class = ReminderSerializer
    permission_classes = [IsOwnerOrReadOnly]

# Chat Message ViewSet
class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

# Health Journal ViewSet
class HealthJournalViewSet(viewsets.ViewSet):
    permission_classes = [IsOwnerOrReadOnly]
    def list(self, request, user_id=None):
        journals = HealthJournal.objects.filter(user_id=user_id)
        serializer = HealthJournalSerializer(journals, many=True)
        return Response(serializer.data, status = status.HTTP_200_OK)

class UserStatisticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id=None):
        # Chỉ cho phép user xem của mình hoặc chuyên gia xem của khách hàng
        if request.user.role == 'user' and request.user.id != user_id:
            return Response({'detail': 'Permission denied.'}, status=403)
        # Lấy dữ liệu HealthProfile, TrainingSchedule, NutritionPlan
        now = timezone.now().date()
        # Thống kê tuần
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        year_ago = now - timedelta(days=365)
        # Lấy health profile
        profile = HealthProfile.objects.filter(user_id=user_id).first()
        # Lấy lịch tập tuần/tháng/năm
        week_sessions = TrainingSession.objects.filter(schedule__user_id=user_id, schedule__date__gte=week_ago)
        month_sessions = TrainingSession.objects.filter(schedule__user_id=user_id, schedule__date__gte=month_ago)
        year_sessions = TrainingSession.objects.filter(schedule__user_id=user_id, schedule__date__gte=year_ago)
        # Tổng calo tiêu thụ
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
        # Chỉ cho phép user xem của mình hoặc chuyên gia xem của khách hàng
        if request.user.role == 'user' and request.user.id != user_id:
            return Response({'detail': 'Permission denied.'}, status=403)
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'detail': 'User not found.'}, status=404)
        # Gợi ý thực đơn đơn giản dựa trên mục tiêu sức khỏe
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
        # Chỉ cho phép user hoặc chuyên gia xem lịch sử chat của mình
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
        date = request.data.get('date')  # Ngày nhắc nhở (tùy chọn)
        if not (reminder_type and time and message):
            return Response({'detail': 'Missing required fields.'}, status=400)
        reminder = Reminder.objects.create(
            user=request.user,
            reminder_type=reminder_type,
            time=time,
            message=message
        )
        return Response({'detail': 'Reminder created.', 'reminder_id': reminder.id}, status=201)

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Đăng ký thành công",
                "user": UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# User Profile View
class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        
        # Lấy thông tin health profile nếu có
        try:
            health_profile = user.health_profile
            health_serializer = HealthProfileSerializer(health_profile)
            health_data = health_serializer.data
        except HealthProfile.DoesNotExist:
            health_data = None

        # Lấy thông tin thống kê
        now = timezone.now().date()
        week_ago = now - timedelta(days=7)
        
        # Lấy số buổi tập trong tuần
        week_sessions = TrainingSession.objects.filter(
            schedule__user=user,
            schedule__date__gte=week_ago
        ).count()
        
        # Lấy số nhắc nhở
        reminders = Reminder.objects.filter(user=user).count()
        
        # Lấy số tin nhắn chưa đọc
        unread_messages = ChatMessage.objects.filter(
            receiver=user,
            is_read=False
        ).count()

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
    
    def put(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'user': serializer.data}, status=200)
        return Response(serializer.errors, status=400)

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
        # Kiểm tra thời gian hết hạn (ví dụ 10 phút)
        if timezone.now() - otp_obj.created_at > timedelta(minutes=10):
            return Response({'error': 'OTP đã hết hạn'}, status=400)
        # Đổi mật khẩu
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
            # Tùy chỉnh thêm nếu muốn tạo user mới
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)