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
  private authService = inject(AuthService);
  private router = inject(Router);

  // Variables del formulario
  dni = '';
  nombre = '';
  apellido = '';
  email = '';
  telefono = '';
  password = '';
  
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isSubmitting = false;
  passwordInputType: 'password' | 'text' = 'password';

  constructor() {}

  togglePassword(): void {
    this.passwordInputType = this.passwordInputType === 'password' ? 'text' : 'password';
  }

  // Validar solo letras (y espacios)
  validarSoloLetras(valor: string): boolean {
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return regex.test(valor);
  }

  // Validar DNI (8 dígitos numéricos)
  validarDNI(dni: string): boolean {
    const regex = /^\d{8}$/;
    return regex.test(dni);
  }

  // Validar teléfono (9 dígitos numéricos)
  validarTelefono(telefono: string): boolean {
    const regex = /^\d{9}$/;
    return regex.test(telefono);
  }

  // Validar email
  validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  handleRegister(): void {
    this.errorMessage = null;
    this.successMessage = null;

    // Validar campos vacíos
    if (!this.dni || !this.nombre || !this.apellido || !this.email || !this.telefono || !this.password) {
      this.errorMessage = 'Por favor, complete todos los campos.';
      return;
    }

    // Validar DNI
    if (!this.validarDNI(this.dni)) {
      this.errorMessage = 'El DNI debe tener exactamente 8 dígitos numéricos.';
      return;
    }

    // Validar Nombre
    if (!this.validarSoloLetras(this.nombre)) {
      this.errorMessage = 'El nombre solo puede contener letras.';
      return;
    }

    // Validar Apellido
    if (!this.validarSoloLetras(this.apellido)) {
      this.errorMessage = 'El apellido solo puede contener letras.';
      return;
    }

    // Validar Email
    if (!this.validarEmail(this.email)) {
      this.errorMessage = 'Ingrese un correo electrónico válido.';
      return;
    }

    // Validar Teléfono
    if (!this.validarTelefono(this.telefono)) {
      this.errorMessage = 'El teléfono debe tener exactamente 9 dígitos numéricos.';
      return;
    }

    // Validar longitud de contraseña
    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.isSubmitting = true;

    this.authService.register(
      this.dni,
      this.nombre,
      this.apellido,
      this.email,
      this.telefono,
      this.password
    ).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response) {
          this.successMessage = '¡Registro exitoso! Redirigiendo a productos...';
          setTimeout(() => {
            this.router.navigate(['/productos']); 
          }, 2000);
        } else {
          this.errorMessage = 'El correo o DNI ya están registrados.';
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error?.error?.mensaje || 'Error al registrar. Intente nuevamente.';
      }
    });
  }

  // Métodos para validación en tiempo real (opcional)
  onDNIInput(event: any): void {
    // Solo permitir números
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 8);
    this.dni = event.target.value;
  }

  onTelefonoInput(event: any): void {
    // Solo permitir números
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 9);
    this.telefono = event.target.value;
  }

  onNombreInput(event: any): void {
    // Solo permitir letras y espacios
    event.target.value = event.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    this.nombre = event.target.value;
  }

  onApellidoInput(event: any): void {
    // Solo permitir letras y espacios
    event.target.value = event.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    this.apellido = event.target.value;
  }
}