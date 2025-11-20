import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoService } from '../../services/productos';
import { CarritoService } from '../../services/carrito-service';
import { NavbarComponent } from '../../shared/navbar/navbar';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css'] 
})
export class ProductosComponent implements OnInit {
  productos: any[] = [];
  categoriaSeleccionada: string = 'Todos';
  categorias: string[] = ['Todos', 'Mujer', 'Hombre', 'Niños'];
  isLoading: boolean = true;
  mensajeNotificacion: string = '';
  mostrarNotificacion: boolean = false;

  constructor(
    private productoService: ProductoService,
    private cd: ChangeDetectorRef,
    public carritoService: CarritoService
  ) {}

  ngOnInit() {
    this.cargarProductos();
  }

  cargarProductos() {
    this.isLoading = true;
    this.productoService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.isLoading = false;
        this.cd.detectChanges(); 
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.isLoading = false;
      }
    });
  }

  filtrarPorCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;
    this.isLoading = true;

    if (categoria === 'Todos') {
      this.cargarProductos();
    } else {
      this.productoService.getProductosPorCategoria(categoria).subscribe({
        next: (data) => {
          this.productos = data;
          this.isLoading = false;
          this.cd.detectChanges();
        },
        error: (error) => {
          console.error('Error al filtrar por categoría:', error);
          this.isLoading = false;
        }
      });
    }
  }

  agregarAlCarrito(producto: any) {
    const stockDisponible = this.carritoService.getStockDisponible(producto);
    
    if (stockDisponible <= 0) {
      this.mostrarMensaje(`No hay más stock disponible de ${producto.nombre}`);
      return;
    }

    const agregado = this.carritoService.addItem(producto);
    
    if (agregado) {
      this.mostrarMensaje(`${producto.nombre} agregado al carrito`);
    } else {
      this.mostrarMensaje(`Stock insuficiente de ${producto.nombre}`);
    }
  }

  getStockDisponible(producto: any): number {
    return this.carritoService.getStockDisponible(producto);
  }

  getCantidadEnCarrito(producto: any): number {
    return this.carritoService.getCantidadEnCarrito(producto.id);
  }

  private mostrarMensaje(mensaje: string) {
    this.mensajeNotificacion = mensaje;
    this.mostrarNotificacion = true;
    
    setTimeout(() => {
      this.mostrarNotificacion = false;
    }, 3000);
  }
}