/**
 * Todo Entity
 * Representa a entidade de tarefa no domínio da aplicação
 */
export class Todo {
  private _id?: number;
  private _text: string;
  private _completed: boolean;

  constructor(text: string, completed: boolean = false, id?: number) {
    this._id = id;
    this._text = text;
    this._completed = completed;
  }

  // Getters
  get id(): number | undefined {
    return this._id;
  }

  get text(): string {
    return this._text;
  }

  get completed(): boolean {
    return this._completed;
  }

  // Setters
  set text(text: string) {
    this._text = text;
  }

  // Métodos de domínio
  complete(): void {
    this._completed = true;
  }

  uncomplete(): void {
    this._completed = false;
  }

  toggle(): void {
    this._completed = !this._completed;
  }

  // Factory method para criar uma nova instância de Todo
  static create(text: string, completed: boolean = false): Todo {
    return new Todo(text, completed);
  }

  // Método para converter a entidade em um objeto simples
  toObject() {
    return {
      id: this._id,
      text: this._text,
      completed: this._completed,
    };
  }
}