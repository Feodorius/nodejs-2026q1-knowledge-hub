import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });
    if (existing) {
      const match = await bcrypt.compare(dto.password, existing.password);
      if (match) {
        return { id: existing.id, login: existing.login, role: existing.role };
      }
      throw new BadRequestException('Login is already taken');
    }

    const password = await bcrypt.hash(
      dto.password,
      parseInt(process.env.CRYPT_SALT ?? '10', 10),
    );

    const user = await this.prisma.user.create({
      data: { login: dto.login, password, role: UserRole.VIEWER },
    });

    return { id: user.id, login: user.login, role: user.role };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });
    if (!user) {
      throw new ForbiddenException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new ForbiddenException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refresh(token: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
      });
    } catch {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    await this.prisma.refreshToken.delete({ where: { token } });

    return this.issueTokens(user);
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
  }

  private async issueTokens(user: {
    id: string;
    login: string;
    role: UserRole;
  }) {
    const payload = {
      userId: user.id,
      login: user.login,
      role: user.role.toLowerCase(),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_KEY,
      expiresIn: process.env.TOKEN_EXPIRE_TIME ?? '15m',
    });

    const refreshExpiresIn = process.env.TOKEN_REFRESH_EXPIRE_TIME ?? '7d';
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_REFRESH_KEY,
      expiresIn: refreshExpiresIn,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
