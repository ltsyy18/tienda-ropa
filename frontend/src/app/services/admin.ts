import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:3000/api/admin';
  private pedidosUrl = 'http://localhost:3000/api/pedidos';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Obtener headers con token
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ==========================================
  // PRODUCTOS
  // ==========================================

  // Crear producto
  crearProducto(producto: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/productos`, producto, {
      headers: this.getHeaders()
    });
  }

  // Subir imagen (multipart/form-data)
  uploadImage(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('imagen', file);
    return this.http.post(`${this.apiUrl}/upload`, fd, {
      headers: this.getHeaders()
    });
  }

  // Editar producto
  editarProducto(id: number, producto: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/productos/${id}`, producto, {
      headers: this.getHeaders()
    });
  }

  // Eliminar producto
  eliminarProducto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/productos/${id}`, {
      headers: this.getHeaders()
    });
  }

  // ==========================================
  // PEDIDOS
  // ==========================================

  // Obtener todos los pedidos
  obtenerPedidos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/pedidos`, {
      headers: this.getHeaders()
    });
  }

  // Actualizar estado de pedido
  actualizarEstadoPedido(pedidoId: number, nuevoEstado: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/pedidos/${pedidoId}/estado`,
      { estado: nuevoEstado },
      { headers: this.getHeaders() }
    );
  }

  // Obtener detalles de un pedido
  obtenerDetallePedido(pedidoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/pedidos/${pedidoId}`, {
      headers: this.getHeaders()
    });
  }
}