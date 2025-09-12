/**
 * User Entity
 * Representa a entidade de usuário no domínio da aplicação
 */
export class User {
  private _id: string;
  private _name: string;
  private _email: string;
  private _emailVerified: boolean;
  private _image?: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(
    id: string,
    name: string,
    email: string,
    emailVerified: boolean,
    createdAt: Date,
    updatedAt: Date,
    image?: string
  ) {
    this._id = id;
    this._name = name;
    this._email = email;
    this._emailVerified = emailVerified;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._image = image;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get email(): string {
    return this._email;
  }

  get emailVerified(): boolean {
    return this._emailVerified;
  }

  get image(): string | undefined {
    return this._image;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Setters
  set name(name: string) {
    this._name = name;
    this._updatedAt = new Date();
  }

  set email(email: string) {
    this._email = email;
    this._updatedAt = new Date();
  }

  set emailVerified(emailVerified: boolean) {
    this._emailVerified = emailVerified;
    this._updatedAt = new Date();
  }

  set image(image: string | undefined) {
    this._image = image;
    this._updatedAt = new Date();
  }

  // Métodos de domínio
  verifyEmail(): void {
    this._emailVerified = true;
    this._updatedAt = new Date();
  }

  updateProfile(name: string, image?: string): void {
    this._name = name;
    if (image) {
      this._image = image;
    }
    this._updatedAt = new Date();
  }

  // Factory method para criar uma nova instância de User
  static create(
    id: string,
    name: string,
    email: string,
    emailVerified: boolean = false,
    image?: string
  ): User {
    const now = new Date();
    return new User(id, name, email, emailVerified, now, now, image);
  }

  // Método para converter a entidade em um objeto simples
  toObject() {
    return {
      id: this._id,
      name: this._name,
      email: this._email,
      emailVerified: this._emailVerified,
      image: this._image,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}