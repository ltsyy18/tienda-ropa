import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ProductoService } from '../../services/productos';
import { AdminService } from '../../services/admin';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-Admin.html',
  styleUrl: './panel-Admin.css'
})
export class PanelAdminComponent implements OnInit {
  productos: any[] = [];
  pedidos: any[] = [];
  isLoading: boolean = true;
  isLoadingPedidos: boolean = true;
  mostrarFormulario: boolean = false; 
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

  // Estadísticas
  stats = {
    totalProductos: 0,
    totalPedidos: 0,
    ventasTotal: 0,
    pedidosPendientes: 0
  };

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

    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading = true;
    this.isLoadingPedidos = true;

    // Cargar productos y pedidos en paralelo
    forkJoin({
      productos: this.productoService.getProductos(),
      pedidos: this.adminService.obtenerPedidos()
    }).subscribe({
      next: (result) => {
        this.productos = result.productos || [];
        this.pedidos = result.pedidos || [];
        
        this.calcularEstadisticas();
        
        this.isLoading = false;
        this.isLoadingPedidos = false;
      },
      error: (error) => {
        console.error('Error cargando datos:', error);
        this.isLoading = false;
        this.isLoadingPedidos = false;
        
        // Si falla pedidos, al menos mostrar productos
        this.cargarProductos();
      }
    });
  }

  cargarProductos() {
    this.isLoading = true;
    this.productoService.getProductos().subscribe({
      next: (data) => {
        this.productos = data || [];
        this.calcularEstadisticas();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.isLoading = false;
      }
    });
  }

  calcularEstadisticas() {
    this.stats.totalProductos = this.productos.length;
    this.stats.totalPedidos = this.pedidos.length;
    this.stats.ventasTotal = this.pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    this.stats.pedidosPendientes = this.pedidos.filter(p => p.estado === 'pendiente').length;
  }

  // ========================================
  // TOGGLE FORMULARIO
  // ========================================
  toggleFormulario() {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.limpiarFormulario();
    }
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
            this.mostrarFormulario = false; 
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
            alert(' Producto creado exitosamente');
            this.cargarProductos();
            this.limpiarFormulario();
            this.mostrarFormulario = false; // ← CERRAR FORMULARIO
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
          if (res && res.imagen_url) {
            this.productoForm.imagen_url = res.imagen_url;
          }
          proceedCreateOrEdit();
        },
        error: (err) => {
          console.error('Error al subir imagen:', err);
          alert(' Error al subir la imagen. Intenta nuevamente.');
        }
      });
    } else {
      proceedCreateOrEdit();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.selectedFile = file;
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
    this.mostrarFormulario = true; // ← ABRIR FORMULARIO
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminarProducto(id: number) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      this.adminService.eliminarProducto(id).subscribe({
        next: () => {
          alert(' Producto eliminado exitosamente');
          this.cargarProductos();
        },
        error: (error) => {
          console.error('Error:', error);
          alert(' Error al eliminar producto');
        }
      });
    }
  }

  // ========================================
  // GESTIÓN DE PEDIDOS
  // ========================================
  cambiarEstadoPedido(pedidoId: number, nuevoEstado: string) {
    this.adminService.actualizarEstadoPedido(pedidoId, nuevoEstado).subscribe({
      next: () => {
        alert(' Estado del pedido actualizado');
        this.cargarDatos();
      },
      error: (error) => {
        console.error('Error:', error);
        alert(' Error al actualizar estado');
      }
    });
  }

  getEstadoColor(estado: string): string {
    const colores: any = {
      'pendiente': 'warning',
      'procesando': 'info',
      'enviado': 'primary',
      'entregado': 'success',
      'cancelado': 'danger'
    };
    return colores[estado] || 'secondary';
  }

  logout() {
    this.authService.logout();
  }
}