import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  email = '';
  password = '';
  errorMessage: string | null = null;
  isSubmitting = false;
  passwordInputType: 'password' | 'text' = 'password';

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/productos']); 
    }
  }

  togglePassword(): void {
    this.passwordInputType = this.passwordInputType === 'password' ? 'text' : 'password';
  }

  handleLogin(): void {
    this.errorMessage = null; 
    this.isSubmitting = true;
    this.cd.detectChanges();

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.cd.detectChanges();
        
        if (response) {
          if (response.rol === 'admin') {
            this.router.navigate(['/panel-admin']);
          } else {
            this.router.navigate(['/productos']);
          }
        } else {
          this.errorMessage = 'Credenciales incorrectas';
          this.cd.detectChanges();
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Error de conexión';
        this.cd.detectChanges();
      }
    });
  }
}