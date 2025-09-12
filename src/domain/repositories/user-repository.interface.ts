import { User } from '../entities/user.entity';

/**
 * Interface para o repositório de usuários
 * Define os métodos que devem ser implementados pelos repositórios concretos
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}