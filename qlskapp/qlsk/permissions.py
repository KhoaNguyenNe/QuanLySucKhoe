from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Chỉ cho phép chủ sở hữu (user) xem/sửa dữ liệu của chính mình.
    Chuyên gia chỉ được xem (read-only) nếu đã liên kết với user đó.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            # Chuyên gia chỉ được xem nếu đã liên kết với user này
            if request.user.role == 'expert':
                # obj là instance của model có trường user hoặc là chính user
                if hasattr(obj, 'user'):
                    return obj.user.expert == request.user
                # Nếu obj là instance của User
                if hasattr(obj, 'expert'):
                    return obj.expert == request.user
            return True  # User thường được xem dữ liệu của mình
        # Chỉ user mới được sửa/xóa dữ liệu của mình
        return (hasattr(obj, 'user') and obj.user == request.user) or obj == request.user

class IsExpert(permissions.BasePermission):
    """
    Chỉ cho phép chuyên gia truy cập.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'expert'

class IsOwnerOrExpert(permissions.BasePermission):
    """
    Chỉ cho phép user thao tác với dữ liệu của mình hoặc chuyên gia được xem dữ liệu của user khác nếu đã liên kết.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'expert':
            # Chuyên gia chỉ được xem nếu đã liên kết với user này
            if hasattr(obj, 'user'):
                return obj.user.expert == request.user
            if hasattr(obj, 'expert'):
                return obj.expert == request.user
            return False
        return (hasattr(obj, 'user') and obj.user == request.user) or obj == request.user 
    