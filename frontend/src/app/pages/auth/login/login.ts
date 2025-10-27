import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  // Importamos CommonModule y FormsModule para usar ngIf, ngModel y ngSubmit
  imports: [CommonModule, FormsModule], 
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  // Inyección de dependencias
  private authService = inject(AuthService);
  private router = inject(Router);

  // Variables para enlazar al formulario (ngModel)
  email = '';
  password = '';
  errorMessage: string | null = null;
  isSubmitting = false;

  // Controla si el input de contraseña es 'password' o 'text'
  passwordInputType: 'password' | 'text' = 'password';

  constructor() { }

  ngOnInit(): void {
    // Redirige al usuario si ya está logeado
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/productos']); 
    }
  }

  /**
   * Alterna la visibilidad de la contraseña.
   */
  togglePassword(): void {
    this.passwordInputType = this.passwordInputType === 'password' ? 'text' : 'password';
  }

  /**
   * Llama al AuthService para intentar iniciar sesión.
   */
  handleLogin(): void {
    this.errorMessage = null; 
    this.isSubmitting = true;

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response) {
          console.log('Inicio de sesión exitoso. Redirigiendo...');
          this.router.navigate(['/productos']); 
        } else {
          // El servicio devolvió null, indicando error de credenciales o de conexión
          this.errorMessage = 'Credenciales incorrectas o error de conexión. Inténtelo de nuevo.';
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Ocurrió un error en la conexión. Inténtelo más tarde.';
      }
    });
  }
}
