import { Component, inject, ChangeDetectorRef } from '@angular/core';
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
  private cd = inject(ChangeDetectorRef);

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

  togglePassword(): void {
    this.passwordInputType = this.passwordInputType === 'password' ? 'text' : 'password';
  }

  validarSoloLetras(valor: string): boolean {
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return regex.test(valor);
  }

  validarDNI(dni: string): boolean {
    const regex = /^\d{8}$/;
    return regex.test(dni);
  }

  validarTelefono(telefono: string): boolean {
    const regex = /^\d{9}$/;
    return regex.test(telefono);
  }

  validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  handleRegister(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.dni || !this.nombre || !this.apellido || !this.email || !this.telefono || !this.password) {
      this.errorMessage = 'Complete todos los campos';
      this.cd.detectChanges();
      return;
    }

    if (!this.validarDNI(this.dni)) {
      this.errorMessage = 'DNI debe tener 8 dígitos';
      this.cd.detectChanges();
      return;
    }

    if (!this.validarSoloLetras(this.nombre)) {
      this.errorMessage = 'Nombre solo puede contener letras';
      this.cd.detectChanges();
      return;
    }

    if (!this.validarSoloLetras(this.apellido)) {
      this.errorMessage = 'Apellido solo puede contener letras';
      this.cd.detectChanges();
      return;
    }

    if (!this.validarEmail(this.email)) {
      this.errorMessage = 'Email inválido';
      this.cd.detectChanges();
      return;
    }

    if (!this.validarTelefono(this.telefono)) {
      this.errorMessage = 'Teléfono debe tener 9 dígitos';
      this.cd.detectChanges();
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Contraseña mínimo 6 caracteres';
      this.cd.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.cd.detectChanges();

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
        this.cd.detectChanges();
        
        if (response) {
          this.successMessage = 'Registro exitoso';
          this.cd.detectChanges();
          setTimeout(() => {
            this.router.navigate(['/productos']); 
          }, 1500);
        } else {
          this.errorMessage = 'Email o DNI ya registrados';
          this.cd.detectChanges();
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = 'Error al registrar';
        this.cd.detectChanges();
      }
    });
  }

  onDNIInput(event: any): void {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 8);
    this.dni = event.target.value;
  }

  onTelefonoInput(event: any): void {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 9);
    this.telefono = event.target.value;
  }

  onNombreInput(event: any): void {
    event.target.value = event.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    this.nombre = event.target.value;
  }

  onApellidoInput(event: any): void {
    event.target.value = event.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    this.apellido = event.target.value;
  }
}