import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private apiUrl = 'http://localhost:3000/api/productos'; // Tu backend

  constructor(private http: HttpClient) {}

  // ✅ Obtener todos los productos
  getProductos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // ✅ Obtener un producto por ID
  getProductoPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // ✅ Obtener productos por categoría
  getProductosPorCategoria(categoria: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categoria/${categoria}`);
  }
}
