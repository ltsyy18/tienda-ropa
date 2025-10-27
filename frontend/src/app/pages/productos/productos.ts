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
  styleUrls: ['./productos.css'] // ✅ Corregido (antes decía styleUrl)
})
export class ProductosComponent implements OnInit {
  productos: any[] = [];
  categoriaSeleccionada: string = 'Todos';
  categorias: string[] = ['Todos', 'Mujer', 'Hombre', 'Niños'];
  isLoading: boolean = true;

  constructor(
    private productoService: ProductoService,
    private cd: ChangeDetectorRef,
    private carritoService: CarritoService
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
        this.cd.detectChanges(); // ✅ fuerza actualización inmediata
        console.log('Productos cargados:', this.productos);
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.isLoading = false;
      }
    });
  }

  filtrarPorCategoria(categoria: string) {
    console.log('Categoría seleccionada:', categoria); // ✅ para depurar
    this.categoriaSeleccionada = categoria;
    this.isLoading = true;

    if (categoria === 'Todos') {
      this.cargarProductos();
    } else {
      this.productoService.getProductosPorCategoria(categoria).subscribe({
        next: (data) => {
          this.productos = data;
          this.isLoading = false;
          this.cd.detectChanges(); // ✅ asegura refresco inmediato
        },
        error: (error) => {
          console.error('Error al filtrar por categoría:', error);
          this.isLoading = false;
        }
      });
    }
  }

  agregarAlCarrito(producto: any) {
  this.carritoService.addItem(producto);
  // TODO: Mostrar toast/notificación de éxito
  }
}