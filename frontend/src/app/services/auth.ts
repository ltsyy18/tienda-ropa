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
  apellido?: string;
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
        // Decodificar token para obtener el ID
        const decoded = this.decodeToken(response.token);
        
        // Guardar datos en localStorage
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userId', decoded?.id || ''); 
        localStorage.setItem('rol', response.rol);
        localStorage.setItem('nombre', response.nombre || 'Usuario');
        localStorage.setItem('apellido', response.apellido || ''); 
        localStorage.setItem('email', decoded?.email || ''); 
        
        
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
 * Decodificar token JWT
 */
private decodeToken(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

/**
 * Obtener ID del usuario
 */
public getUserId(): number | null {
  const id = localStorage.getItem('userId');
  return id ? parseInt(id) : null;
}

  /**
   * Registro SIN DNI (solo nombre, apellido, email, teléfono, password)
   */
  register(
  dni: string,          
  nombre: string,
  apellido: string,
  email: string,
  telefono: string,
  password: string
): Observable<AuthResponse | null> {
  const body = { 
    dni,                
    nombre, 
    apellido, 
    email, 
    telefono, 
    password 
  };

  return this.http.post<AuthResponse>(`${API_URL}/register`, body).pipe(
    map(response => {
      if (response.token) {

        const decoded = this.decodeToken(response.token);

        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userId', decoded?.id || ''); 
        localStorage.setItem('rol', response.rol);
        localStorage.setItem('nombre', response.nombre || nombre);
        localStorage.setItem('email', decoded?.email || '');
        localStorage.setItem('dni',dni);
        localStorage.setItem('telefono',telefono);


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