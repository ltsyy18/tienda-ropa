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
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  
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
    this.selectedFile = null;
    this.previewUrl = null;
  }

  guardarProducto() {
    const proceedCreateOrEdit = () => {
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
    };

    // Si hay archivo seleccionado, subirlo primero
    if (this.selectedFile) {
      this.adminService.uploadImage(this.selectedFile).subscribe({
        next: (res: any) => {
          // Se espera { imagen_url: 'http://...' }
          if (res && res.imagen_url) {
            this.productoForm.imagen_url = res.imagen_url;
          }
          proceedCreateOrEdit();
        },
        error: (err) => {
          console.error('Error al subir imagen:', err);
          alert('Error al subir la imagen. Intenta nuevamente.');
        }
      });
    } else {
      // No hay archivo: proceder normalmente (usa productoForm.imagen_url si existe)
      proceedCreateOrEdit();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.selectedFile = file;
      // Preview
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
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
