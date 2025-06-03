from rest_framework import viewsets, permissions, status, parsers
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from .models import User, Exercise, TrainingSchedule, TrainingSession, NutritionPlan, Reminder, ChatMessage, HealthJournal, PasswordResetOTP, WorkoutSession, WorkoutExercise, HealthMetricsHistory, WaterSession
from .serializers import (
    UserSerializer, ExerciseSerializer, TrainingScheduleSerializer,
    TrainingSessionSerializer, NutritionPlanSerializer, ReminderSerializer, ChatMessageSerializer, HealthJournalSerializer,
    RegisterSerializer, WorkoutSessionSerializer, WorkoutExerciseSerializer, HealthMetricsHistorySerializer, WaterSessionSerializer
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
from django.db.models import Sum, Count
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics

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
            # Thống kê nhanh
            now = timezone.now().date()
            week_ago = now - timedelta(days=7)
            week_sessions = TrainingSession.objects.filter(schedule__user=user, schedule__date__gte=week_ago).count()
            reminders = Reminder.objects.filter(user=user).count()
            unread_messages = ChatMessage.objects.filter(receiver=user, is_read=False).count()
            response_data = {
                'user': serializer.data,
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
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'detail': 'User not found.'}, status=404)
        # Lấy chỉ số sức khỏe gần nhất
        latest_metrics = HealthMetricsHistory.objects.filter(user_id=user_id).order_by('-date', '-time').first()
        week_sessions = TrainingSession.objects.filter(schedule__user_id=user_id, schedule__date__gte=week_ago)
        month_sessions = TrainingSession.objects.filter(schedule__user_id=user_id, schedule__date__gte=month_ago)
        year_sessions = TrainingSession.objects.filter(schedule__user_id=user_id, schedule__date__gte=year_ago)
        def total_calories(sessions):
            return sum([s.exercise.calories_burned if s.exercise else 0 for s in sessions])
        data = {
            'bmi': user.bmi,
            'latest_metrics': HealthMetricsHistorySerializer(latest_metrics).data if latest_metrics else None,
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

# Workout Session ViewSet
class WorkoutSessionViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        sessions = WorkoutSession.objects.filter(user=request.user).order_by('-start_time')
        serializer = WorkoutSessionSerializer(sessions, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        try:
            # Kiểm tra danh sách bài tập
            exercises = request.data.get('exercises', [])
            if not exercises:
                return Response(
                    {"error": "No exercises selected."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Tạo buổi tập mới
            session = WorkoutSession.objects.create(
                user=request.user,
                start_time=timezone.now()
            )

            # Lấy danh sách ID bài tập
            exercise_ids = []
            for ex in exercises:
                try:
                    ex_id = int(ex.get('id', 0))
                    if ex_id > 0:
                        exercise_ids.append(ex_id)
                except (ValueError, TypeError):
                    continue
            
            # Kiểm tra xem có ID bài tập hợp lệ không
            if not exercise_ids:
                session.delete()
                return Response(
                    {"error": "No valid exercise IDs provided."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Lấy các bài tập từ database
            exercises = Exercise.objects.filter(id__in=exercise_ids)
            
            # Kiểm tra xem có tìm thấy bài tập nào không
            if not exercises.exists():
                session.delete()
                return Response(
                    {"error": "No valid exercises found."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Tạo các bài tập cho buổi tập
            workout_exercises = []
            for exercise in exercises:
                workout_exercise = WorkoutExercise(
                    workout_session=session,
                    exercise=exercise,
                    duration=0,  # Giá trị mặc định
                    calories_burned=0  # Giá trị mặc định
                )
                workout_exercises.append(workout_exercise)
            
            # Lưu tất cả các bài tập cùng một lúc
            WorkoutExercise.objects.bulk_create(workout_exercises)

            # Lấy lại session với các bài tập đã tạo
            session.refresh_from_db()

            # Serialize và trả về kết quả
            serializer = WorkoutSessionSerializer(session, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Nếu có lỗi, xóa buổi tập nếu đã tạo
            if 'session' in locals():
                session.delete()
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        session = WorkoutSession.objects.filter(pk=pk, user=request.user).first()
        if not session:
            return Response({'detail': 'Not found.'}, status=404)
            
        serializer = WorkoutSessionSerializer(session)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete_exercise(self, request, pk=None):
        try:
            print(f"Received data: {request.data}")  # Log dữ liệu nhận được
            
            session = WorkoutSession.objects.filter(pk=pk, user=request.user).first()
            if not session:
                return Response({'detail': 'Không tìm thấy buổi tập.'}, status=404)
                
            exercise_id = request.data.get('exercise_id')
            duration = request.data.get('duration')
            calories_burned = request.data.get('calories_burned')
            
            print(f"Exercise ID: {exercise_id}, Duration: {duration}, Calories: {calories_burned}")  # Log dữ liệu đã parse
            
            # Kiểm tra dữ liệu đầu vào
            if not exercise_id:
                return Response({'detail': 'Thiếu ID bài tập.'}, status=400)
            
            try:
                exercise_id = int(exercise_id)
                duration = int(duration) if duration else 0
                calories_burned = int(calories_burned) if calories_burned else 0
            except (ValueError, TypeError):
                return Response({'detail': 'Dữ liệu không hợp lệ.'}, status=400)
            
            # Kiểm tra bài tập có tồn tại không
            exercise = Exercise.objects.filter(id=exercise_id).first()
            if not exercise:
                return Response({'detail': 'Không tìm thấy bài tập.'}, status=404)
            
            # Kiểm tra bài tập đã được thêm vào buổi tập chưa
            workout_exercise = WorkoutExercise.objects.filter(
                workout_session=session,
                exercise=exercise
            ).first()
            
            if not workout_exercise:
                return Response({'detail': 'Bài tập chưa được thêm vào buổi tập.'}, status=400)
            
            # Cập nhật thông tin bài tập
            workout_exercise.duration = duration
            workout_exercise.calories_burned = calories_burned
            workout_exercise.save()
            
            print(f"Updated workout exercise: {workout_exercise.id}, Calories: {workout_exercise.calories_burned}")  # Log sau khi cập nhật
            
            # Tính lại tổng calo của buổi tập
            workout_exercises = WorkoutExercise.objects.filter(workout_session=session)
            total_calories = sum(ex.calories_burned for ex in workout_exercises)
            
            print(f"Total calories before update: {session.total_calories}")  # Log tổng calo trước khi cập nhật
            print(f"Calculated total calories: {total_calories}")  # Log tổng calo đã tính
            
            session.total_calories = total_calories
            session.save()
            
            print(f"Updated session total calories: {session.total_calories}")  # Log tổng calo sau khi cập nhật
            
            return Response({
                'detail': 'Hoàn thành bài tập.',
                'workout_exercise': WorkoutExerciseSerializer(workout_exercise).data,
                'total_calories': total_calories
            }, status=200)
            
        except Exception as e:
            print(f"Error in complete_exercise: {str(e)}")  # Log lỗi
            return Response({
                'detail': f'Lỗi khi hoàn thành bài tập: {str(e)}'
            }, status=400)
    
    @action(detail=True, methods=['post'])
    def complete_workout(self, request, pk=None):
        try:
            session = WorkoutSession.objects.filter(pk=pk, user=request.user).first()
            if not session:
                return Response({'detail': 'Không tìm thấy buổi tập.'}, status=404)
            
            print(f"Completing workout session: {session.id}")  # Log ID buổi tập
            
            # Tính lại tổng calo trước khi hoàn thành
            workout_exercises = WorkoutExercise.objects.filter(workout_session=session)
            total_calories = sum(ex.calories_burned for ex in workout_exercises)
            
            print(f"Current total calories: {session.total_calories}")  # Log tổng calo hiện tại
            print(f"Calculated total calories: {total_calories}")  # Log tổng calo đã tính
            
            session.end_time = timezone.now()
            session.is_completed = True
            session.total_calories = total_calories
            session.save()
            
            print(f"Final total calories: {session.total_calories}")  # Log tổng calo cuối cùng
            
            return Response({
                'detail': 'Hoàn thành buổi tập.',
                'total_calories': total_calories
            }, status=200)
            
        except Exception as e:
            print(f"Error in complete_workout: {str(e)}")  # Log lỗi
            return Response({
                'detail': f'Lỗi khi hoàn thành buổi tập: {str(e)}'
            }, status=400)

class HealthMetricsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_health_metrics(self, request):
        """Lấy các chỉ số sức khỏe hiện tại của người dùng"""
        latest_metrics = HealthMetricsHistory.objects.filter(user=request.user).order_by('-date', '-time').first()
        data = {
            'bmi': request.user.bmi,
            'metrics': HealthMetricsHistorySerializer(latest_metrics).data if latest_metrics else None
        }
        return Response(data)

    def update_water_intake(self, request):
        """Cập nhật lượng nước uống"""
        try:
            amount = float(request.data.get('amount', 0))  # Lượng nước uống thêm (lít)
            today = timezone.now().date()
            # Lấy hoặc tạo bản ghi HealthMetricsHistory cho hôm nay
            history, created = HealthMetricsHistory.objects.get_or_create(
                user=request.user,
                date=today,
                defaults={'water_intake': 0}
            )
            history.water_intake += amount
            history.save()
            return Response(HealthMetricsHistorySerializer(history).data)
        except ValueError:
            return Response({"detail": "Invalid amount value."}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    def update_steps(self, request):
        """Cập nhật số bước đi trong ngày"""
        try:
            steps = int(request.data.get('steps', 0))
            today = timezone.now().date()
            history, created = HealthMetricsHistory.objects.get_or_create(
                user=request.user,
                date=today,
                defaults={'steps': 0}
            )
            history.steps = steps
            history.save()
            return Response(HealthMetricsHistorySerializer(history).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    def update_heart_rate(self, request):
        """Cập nhật nhịp tim trong ngày"""
        try:
            heart_rate = int(request.data.get('heart_rate', 0))
            today = timezone.now().date()
            history, created = HealthMetricsHistory.objects.get_or_create(
                user=request.user,
                date=today,
                defaults={'heart_rate': 0}
            )
            history.heart_rate = heart_rate
            history.save()
            return Response(HealthMetricsHistorySerializer(history).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    def update_bmi(self, request):
        """Cập nhật BMI cho user"""
        try:
            bmi = float(request.data.get('bmi', 0))
            user = request.user
            user.bmi = bmi
            user.save()
            return Response({'bmi': user.bmi})
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    def get_health_history(self, request):
        """Lấy lịch sử các chỉ số sức khỏe"""
        try:
            # Lấy lịch sử trong 7 ngày gần nhất
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=7)
            history = HealthMetricsHistory.objects.filter(
                user=request.user,
                date__range=[start_date, end_date]
            ).order_by('-date', '-time')
            serializer = HealthMetricsHistorySerializer(history, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

class TrainingHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=6)
        # Lấy lịch tập của user trong 7 ngày gần nhất
        schedules = TrainingSchedule.objects.filter(user=user, date__range=[start_date, end_date])
        # Lấy các session theo schedule
        sessions = TrainingSession.objects.filter(schedule__in=schedules)
        # Gom nhóm theo ngày
        result = []
        for i in range(7):
            day = start_date + timedelta(days=i)
            day_sessions = sessions.filter(schedule__date=day)
            session_count = day_sessions.count()
            total_calories = sum([s.exercise.calories_burned if s.exercise else 0 for s in day_sessions])
            result.append({
                'date': str(day),
                'session_count': session_count,
                'total_calories': total_calories
            })
        return Response(result)

class TrainingStatisticsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        mode = request.GET.get('mode', 'week')
        today = timezone.now().date()
        data = []
        if mode == 'week':
            # Lấy ngày đầu tuần (Chủ nhật)
            start_of_week = today - timedelta(days=today.weekday() + 1 if today.weekday() < 6 else 0)
            weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
            for i in range(7):
                day = start_of_week + timedelta(days=i)
                sessions = WorkoutSession.objects.filter(user=user, start_time__date=day)
                session_count = sessions.count()
                total_calories = sessions.aggregate(Sum('total_calories'))['total_calories__sum'] or 0
                data.append({
                    'weekday': weekdays[i],
                    'date': day.strftime('%d/%m'),
                    'session_count': session_count,
                    'total_calories': total_calories
                })
        elif mode == 'month':
            year = today.year
            for month in range(1, 13):
                sessions = WorkoutSession.objects.filter(user=user, start_time__year=year, start_time__month=month)
                session_count = sessions.count()
                total_calories = sessions.aggregate(Sum('total_calories'))['total_calories__sum'] or 0
                data.append({
                    'month': f'{month:02d}/{year}',
                    'session_count': session_count,
                    'total_calories': total_calories
                })
        elif mode == 'year':
            years = WorkoutSession.objects.filter(user=user).dates('start_time', 'year')
            for y in years:
                sessions = WorkoutSession.objects.filter(user=user, start_time__year=y.year)
                session_count = sessions.count()
                total_calories = sessions.aggregate(Sum('total_calories'))['total_calories__sum'] or 0
                data.append({
                    'year': str(y.year),
                    'session_count': session_count,
                    'total_calories': total_calories
                })
        return Response(data)

class WaterSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = WaterSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WaterSession.objects.filter(user=self.request.user).order_by('-date', '-time')

    def perform_create(self, serializer):
        today = timezone.now().date()
        # Lưu session mới
        instance = serializer.save(user=self.request.user, date=today)
        # Tính tổng nước trong ngày
        total = WaterSession.objects.filter(
            user=self.request.user, date=today
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        # Cập nhật hoặc tạo HealthMetricsHistory
        health, created = HealthMetricsHistory.objects.get_or_create(
            user=self.request.user, date=today,
            defaults={'water_intake': total}
        )
        if not created:
            health.water_intake = total
            health.save()