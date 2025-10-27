import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit {
  nombreUsuario: string = '';
  cantidadCarrito: number = 0;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    // Suscribirse al nombre del usuario
    this.authService.nombreUsuario$.subscribe(nombre => {
      this.nombreUsuario = nombre;
    });
    
    // Si ya hay sesión, cargar el nombre
    if (this.authService.isLoggedIn()) {
      this.nombreUsuario = this.authService.getNombreUsuario();
    }
  }

  logout() {
    this.authService.logout();
  }
}
