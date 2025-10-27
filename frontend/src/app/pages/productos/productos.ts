import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoService } from '../../services/productos';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { CarritoService } from '../../services/carrito-service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class ProductosComponent implements OnInit {
  productos: any[] = [];
  categoriaSeleccionada: string = 'Todos';
  categorias: string[] = ['Todos', 'Mujer', 'Hombre', 'Niños'];

  constructor(
    private productoService: ProductoService,
    private carritoService: CarritoService
  ) {}

  ngOnInit() {
    this.cargarProductos();
  }

  cargarProductos() {
    this.productoService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        console.log('Productos cargados:', this.productos);
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
      }
    });
  }

  filtrarPorCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;
    
    if (categoria === 'Todos') {
      this.cargarProductos();
    } else {
      this.productoService.getProductosPorCategoria(categoria).subscribe({
        next: (data) => {
          this.productos = data;
        },
        error: (error) => {
          console.error('Error:', error);
        }
      });
    }
  }

  agregarAlCarrito(producto: any) {
    this.carritoService.addItem(producto);
    // TODO: Mostrar toast/notificación de éxito
  }
}
