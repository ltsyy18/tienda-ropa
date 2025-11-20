import { Injectable, signal } from '@angular/core';
import { computed } from '@angular/core';

interface CartItem {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen_url?: string;
  stock?: number;
}

interface Cart {
  items: CartItem[];
}

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private cartSignal = signal<Cart>({ items: [] });
  
  public totalItems = computed(() => 
    this.cartSignal().items.reduce((sum, item) => sum + item.cantidad, 0)
  );
  
  public totalPrice = computed(() => 
    this.cartSignal().items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
  );

  constructor() {
    this.loadCart();
  }

  getCart(): Cart {
    return this.cartSignal();
  }

  addItem(producto: any, cantidad: number = 1): boolean {
    const cart = this.cartSignal();
    const existingItem = cart.items.find(item => item.id === producto.id);

    if (existingItem) {
      const nuevaCantidad = existingItem.cantidad + cantidad;
      
      if (producto.stock && nuevaCantidad > producto.stock) {
        return false;
      }
      
      existingItem.cantidad = nuevaCantidad;
    } else {
      if (producto.stock && cantidad > producto.stock) {
        return false;
      }

      cart.items.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: cantidad,
        imagen_url: producto.imagen_url,
        stock: producto.stock
      });
    }

    this.cartSignal.set({ ...cart });
    this.saveCart();
    return true;
  }

  updateQuantity(id: number, cantidad: number): boolean {
    const cart = this.cartSignal();
    const item = cart.items.find(item => item.id === id);

    if (item) {
      if (cantidad <= 0) {
        this.removeItem(id);
        return true;
      }

      if (item.stock && cantidad > item.stock) {
        return false;
      }

      item.cantidad = cantidad;
      this.cartSignal.set({ ...cart });
      this.saveCart();
      return true;
    }
    return false;
  }

  removeItem(id: number): void {
    const cart = this.cartSignal();
    cart.items = cart.items.filter(item => item.id !== id);
    this.cartSignal.set({ ...cart });
    this.saveCart();
  }

  clear(): void {
    this.cartSignal.set({ items: [] });
    this.saveCart();
  }

  getCantidadEnCarrito(productoId: number): number {
    const cart = this.cartSignal();
    const item = cart.items.find(item => item.id === productoId);
    return item ? item.cantidad : 0;
  }

  getStockDisponible(producto: any): number {
    const cantidadEnCarrito = this.getCantidadEnCarrito(producto.id);
    return producto.stock - cantidadEnCarrito;
  }

  private loadCart(): void {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cart = JSON.parse(savedCart);
        this.cartSignal.set(cart);
      } catch (e) {
        console.error('Error al cargar carrito:', e);
        localStorage.removeItem('cart');
      }
    }
  }

  private saveCart(): void {
    localStorage.setItem('cart', JSON.stringify(this.cartSignal()));
  }
}