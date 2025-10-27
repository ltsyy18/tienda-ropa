import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ProductoService } from '../../services/productos';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-Admin.html',
  styleUrl: './panel-Admin.css'
})
export class PanelAdminComponent implements OnInit {
  productos: any[] = [];
  isLoading: boolean = true;
  modoEdicion: boolean = false;
  
  // Formulario
  productoForm = {
    id: null as number | null,
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0,
    categoria: 'Mujer',
    talla: '',
    color: '',
    imagen_url: ''
  };

  categorias = ['Mujer', 'Hombre', 'Niños'];

  constructor(
    private authService: AuthService,
    private productoService: ProductoService,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit() {
    // Verificar si es admin
    if (!this.authService.isAdmin()) {
      alert('Acceso denegado. Solo para administradores.');
      this.router.navigate(['/productos']);
      return;
    }

    this.cargarProductos();
  }

  cargarProductos() {
    this.isLoading = true;
    this.productoService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.isLoading = false;
      }
    });
  }

  limpiarFormulario() {
    this.productoForm = {
      id: null,
      nombre: '',
      descripcion: '',
      precio: 0,
      stock: 0,
      categoria: 'Mujer',
      talla: '',
      color: '',
      imagen_url: ''
    };
    this.modoEdicion = false;
  }

  guardarProducto() {
    if (this.modoEdicion && this.productoForm.id) {
      // Editar
      this.adminService.editarProducto(this.productoForm.id, this.productoForm).subscribe({
        next: () => {
          alert('Producto actualizado exitosamente');
          this.cargarProductos();
          this.limpiarFormulario();
        },
        error: (error) => {
          console.error('Error:', error);
          alert('Error al actualizar producto');
        }
      });
    } else {
      // Crear
      this.adminService.crearProducto(this.productoForm).subscribe({
        next: () => {
          alert('Producto creado exitosamente');
          this.cargarProductos();
          this.limpiarFormulario();
        },
        error: (error) => {
          console.error('Error:', error);
          alert('Error al crear producto');
        }
      });
    }
  }

  editarProducto(producto: any) {
    this.productoForm = { ...producto };
    this.modoEdicion = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminarProducto(id: number) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      this.adminService.eliminarProducto(id).subscribe({
        next: () => {
          alert('Producto eliminado exitosamente');
          this.cargarProductos();
        },
        error: (error) => {
          console.error('Error:', error);
          alert('Error al eliminar producto');
        }
      });
    }
  }

  logout() {
    this.authService.logout();
  }
}
