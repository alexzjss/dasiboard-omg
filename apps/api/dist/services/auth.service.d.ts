export declare const authService: {
    register(email: string, password: string, displayName: string): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
    }>;
    login(email: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken: string): Promise<void>;
    me(userId: string): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        photoUrl: string | null;
        bio: string | null;
        turma: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
    }>;
    updateProfile(userId: string, data: {
        displayName?: string;
        bio?: string;
        turma?: string;
    }): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        photoUrl: string | null;
        bio: string | null;
        turma: string | null;
    }>;
    _issueTokens(userId: string, email: string, role: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
};
//# sourceMappingURL=auth.service.d.ts.map