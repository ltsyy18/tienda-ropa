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
    public carritoService: CarritoService
  ) {}

  ngOnInit() {
    this.authService.nombreUsuario$.subscribe(nombre => {
      this.nombreUsuario = nombre;
    });
    
    if (this.authService.isLoggedIn()) {
      this.nombreUsuario = this.authService.getNombreUsuario();
    }
  }

  logout() {
    this.authService.logout();
  }

  eliminarDelCarrito(id: number) {
    if (confirm('¿Eliminar este producto del carrito?')) {
      this.carritoService.removeItem(id);
    }
  }

  actualizarCantidad(id: number, cantidad: number) {
    if (cantidad < 1) {
      this.eliminarDelCarrito(id);
      return;
    }

    const actualizado = this.carritoService.updateQuantity(id, cantidad);
    
    if (!actualizado) {
      const item = this.carritoService.getCart().items.find(i => i.id === id);
      alert(`Stock insuficiente. Máximo disponible: ${item?.stock || 0}`);
    }
  }

  onCantidadInput(id: number, event: any) {
    const nuevaCantidad = parseInt(event.target.value);
    if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
      event.target.value = 1;
      return;
    }
    this.actualizarCantidad(id, nuevaCantidad);
  }

  vaciarCarrito() {
    if (confirm('¿Vaciar todo el carrito?')) {
      this.carritoService.clear();
    }
  }
}