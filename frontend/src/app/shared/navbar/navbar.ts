import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CarritoService } from '../../services/carrito-service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit {
  nombreUsuario: string = '';
  cantidadCarrito: number = 0;


  constructor(
    public authService: AuthService,
    public carritoService: CarritoService  // público para usar en el template
  ) {}


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

  // Helpers para el carrito
  eliminarDelCarrito(id: number) {
    this.carritoService.removeItem(id);
  }

  actualizarCantidad(id: number, cantidad: number) {
    this.carritoService.updateQuantity(id, cantidad);
  }
}
