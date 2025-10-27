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
  // Usar signals para estado reactivo
  private cartSignal = signal<Cart>({ items: [] });
  
  // Computados para totales
  public totalItems = computed(() => 
    this.cartSignal().items.reduce((sum, item) => sum + item.cantidad, 0)
  );
  
  public totalPrice = computed(() => 
    this.cartSignal().items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
  );

  constructor() {
    // Cargar carrito de localStorage al inicio
    this.loadCart();
  }

  // Obtener carrito actual
  getCart(): Cart {
    return this.cartSignal();
  }

  // Añadir item al carrito
  addItem(producto: any, cantidad: number = 1): void {
    const cart = this.cartSignal();
    const existingItem = cart.items.find(item => item.id === producto.id);

    if (existingItem) {
      // Actualizar cantidad si ya existe
      existingItem.cantidad += cantidad;
    } else {
      // Añadir nuevo item
      cart.items.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: cantidad,
        imagen_url: producto.imagen_url,
        stock: producto.stock
      });
    }

    // Actualizar signal y persistir
    this.cartSignal.set({ ...cart });
    this.saveCart();
  }

  // Actualizar cantidad de un item
  updateQuantity(id: number, cantidad: number): void {
    const cart = this.cartSignal();
    const item = cart.items.find(item => item.id === id);

    if (item) {
      if (cantidad <= 0) {
        // Eliminar si cantidad es 0 o menor
        this.removeItem(id);
      } else {
        item.cantidad = cantidad;
        this.cartSignal.set({ ...cart });
        this.saveCart();
      }
    }
  }

  // Eliminar item del carrito
  removeItem(id: number): void {
    const cart = this.cartSignal();
    cart.items = cart.items.filter(item => item.id !== id);
    this.cartSignal.set({ ...cart });
    this.saveCart();
  }

  // Limpiar carrito
  clear(): void {
    this.cartSignal.set({ items: [] });
    this.saveCart();
  }

  // --- Helpers privados ---

  private loadCart(): void {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cart = JSON.parse(savedCart);
        this.cartSignal.set(cart);
      } catch (e) {
        console.error('Error loading cart:', e);
        localStorage.removeItem('cart');
      }
    }
  }

  private saveCart(): void {
    localStorage.setItem('cart', JSON.stringify(this.cartSignal()));
  }
}
