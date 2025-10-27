import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoService } from '../../services/productos';
import { NavbarComponent } from '../../shared/navbar/navbar';

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
  isLoading: boolean = true;
  constructor(private productoService: ProductoService) {}

  ngOnInit() {
    this.cargarProductos();
  }

  cargarProductos() {
    this.isLoading = true;
    this.productoService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.isLoading = false;
        console.log('Productos cargados:', this.productos);
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
        },
        error: (error) => {
          console.error('Error:', error);
          this.isLoading = false;
        }
      });
    }
  }

  agregarAlCarrito(producto: any) {
    console.log('Agregar al carrito:', producto);
    // TODO: Implementar lógica del carrito
  }
}
