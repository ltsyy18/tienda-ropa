import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class RegistroComponent {
  // Inyección de dependencias
  private authService = inject(AuthService);
  private router = inject(Router);

  // Variables para enlazar al formulario (ngModel)
  nombre = '';
  apellido = '';
  email = '';
  telefono = '';
  password = '';

  errorMessage: string | null = null;
  successMessage: string | null = null;
  isSubmitting = false;

  // Controla si el input de contraseña es 'password' o 'text'
  passwordInputType: 'password' | 'text' = 'password';

  constructor() {}

  /**
   * Alterna la visibilidad de la contraseña.
   */
  togglePassword(): void {
    this.passwordInputType = this.passwordInputType === 'password' ? 'text' : 'password';
  }

  /**
   * Llama al AuthService para intentar registrar un nuevo usuario.
   */
  handleRegister(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.isSubmitting = true;

    // Validación simple en el frontend
    if (!this.nombre || !this.apellido || !this.email || !this.telefono || !this.password) {
      this.errorMessage = 'Por favor, complete todos los campos requeridos.';
      this.isSubmitting = false;
      return;
    }

    this.authService.register(
      this.nombre,
      this.apellido,
      this.email,
      this.telefono,
      this.password
    ).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response) {
          // Si el registro fue exitoso (el servicio devolvió una respuesta)
          this.successMessage = '¡Registro exitoso! Ya puedes iniciar sesión.';
          // Opcional: Redirigir al login después de un breve tiempo
          setTimeout(() => {
            this.router.navigate(['/login']); 
          }, 2000);
        } else {
          // El servicio devolvió null, indicando error genérico (ej. email ya existe, error de conexión)
          this.errorMessage = 'El correo electrónico ya está registrado o hubo un error en el servidor.';
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Ocurrió un error inesperado. Por favor, revise su conexión o intente más tarde.';
      }
    });
  }
}
