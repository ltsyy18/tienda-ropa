import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';

const API_URL = 'http://localhost:3000/api/auth';

interface AuthResponse {
  token: string;
  rol: string;
  nombre?: string;
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private isAuthenticated = false;
  
  // Observable para compartir el nombre del usuario
  private nombreUsuarioSubject = new BehaviorSubject<string>('');
  public nombreUsuario$ = this.nombreUsuarioSubject.asObservable();

  constructor() {
    // Cargar datos al iniciar si ya hay sesión
    const nombre = localStorage.getItem('nombre');
    if (nombre) {
      this.nombreUsuarioSubject.next(nombre);
      this.isAuthenticated = true;
    }
  }

  /**
   * Login de usuario (admin o cliente)
   */
  login(email: string, password: string): Observable<AuthResponse | null> {
    const body = { email, password };

    return this.http.post<AuthResponse>(`${API_URL}/login`, body).pipe(
      map(response => {
        if (response.token) {
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('rol', response.rol);
          localStorage.setItem('nombre', response.nombre || 'Usuario');
          
          this.isAuthenticated = true;
          this.nombreUsuarioSubject.next(response.nombre || 'Usuario');
          
          return response;
        }
        return null;
      }),
      catchError(error => {
        console.error('Login failed:', error);
        this.isAuthenticated = false;
        return of(null);
      })
    );
  }

  /**
   * Registro SIN DNI (solo nombre, apellido, email, teléfono, password)
   */
  register(
    nombre: string,
    apellido: string,
    email: string,
    telefono: string,
    password: string
  ): Observable<AuthResponse | null> {
    const body = { 
      nombre, 
      apellido, 
      email, 
      telefono, 
      password,
      dni: null // Enviamos null, el backend lo acepta
    };

    return this.http.post<AuthResponse>(`${API_URL}/register`, body).pipe(
      map(response => {
        if (response.token) {
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('rol', response.rol);
          localStorage.setItem('nombre', response.nombre || nombre);
          
          this.isAuthenticated = true;
          this.nombreUsuarioSubject.next(response.nombre || nombre);
          
          return response;
        }
        return null;
      }),
      catchError(error => {
        console.error('Registration failed:', error);
        return of(null);
      })
    );
  }

  /**
   * Verificar si está autenticado
   */
  public isLoggedIn(): boolean {
    return this.isAuthenticated || !!localStorage.getItem('authToken');
  }

  /**
   * Obtener nombre del usuario
   */
  public getNombreUsuario(): string {
    return localStorage.getItem('nombre') || 'Usuario';
  }

  /**
   * Verificar si es admin
   */
  public isAdmin(): boolean {
    return localStorage.getItem('rol') === 'admin';
  }

  /**
   * Cerrar sesión
   */
  public logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('rol');
    localStorage.removeItem('nombre');
    this.isAuthenticated = false;
    this.nombreUsuarioSubject.next('');
    this.router.navigate(['/login']);
  }
  public getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}