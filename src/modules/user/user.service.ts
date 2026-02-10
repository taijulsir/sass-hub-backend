import { User, IUserDocument } from './user.model';
import { ApiError } from '../../utils/api-error';
import { UpdateUserDto } from './user.dto';
import { Membership } from '../membership/membership.model';

export class UserService {
  // Get user by ID
  static async getById(userId: string): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  // Get user by email
  static async getByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  // Update user
  static async update(userId: string, dto: UpdateUserDto): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (dto.name) user.name = dto.name;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;

    await user.save();
    return user;
  }

  // Get user organizations
  static async getUserOrganizations(userId: string) {
    const memberships = await Membership.find({ userId })
      .populate('organizationId')
      .sort({ joinedAt: -1 });

    return memberships.map((m) => ({
      organization: m.organizationId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  // Check if user exists
  static async exists(userId: string): Promise<boolean> {
    const count = await User.countDocuments({ _id: userId });
    return count > 0;
  }

  // Check if email is taken
  static async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { email: email.toLowerCase() };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    const count = await User.countDocuments(query);
    return count > 0;
  }
}
