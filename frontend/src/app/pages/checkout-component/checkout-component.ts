import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito-service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-checkout-component',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './checkout-component.html',
  styleUrls: ['./checkout-component.css'],
})
export class CheckoutComponent implements OnInit {
  private authService = inject(AuthService);
  
  mensajeExito: string = '';
  mensajeError: string = '';
  isProcessing: boolean = false;
  isLoggedIn: boolean = false;

  dni: string = '';
  nombres: string = '';
  apellidos: string = '';
  direccion: string = '';
  telefono: string = '';
  metodoPago: string = 'yape';
  numeroOperacion: string = '';
  comprobanteUrl: string = '';
  selectedFile: File | null = null;
  orderResult: any = null;
  orderSnapshot: any = null;
  
  formErrors: { [key: string]: string } = {
    dni: '',
    nombres: '',
    apellidos: '',
    direccion: '',
    telefono: ''
  };

  constructor(
    private router: Router,
    public carritoService: CarritoService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Verificar si está logueado
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (this.isLoggedIn) {
      // Pre-llenar datos del usuario logueado
      this.dni = localStorage.getItem('dni') || '';
      this.nombres = localStorage.getItem('nombre') || '';
      // Si no tienes apellido guardado, dejarlo vacío
      this.apellidos = localStorage.getItem('apellido') || '';
      this.telefono = localStorage.getItem('telefono') || '';
      // Dirección dejala editable
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const formData = new FormData();
      formData.append('comprobante', file);
      
      this.http.post<any>('http://localhost:3000/api/upload-comprobante', formData)
        .subscribe({
          next: (response) => {
            this.comprobanteUrl = response.url;
          },
          error: (error) => {
            console.error('Error al subir comprobante:', error);
            this.mensajeError = 'Error al subir el comprobante';
          }
        });
    }
  }

  private validateDNI(): boolean {
    if (!this.dni) {
      this.formErrors['dni'] = 'El DNI es requerido';
      return false;
    }
    if (!/^\d{8}$/.test(this.dni)) {
      this.formErrors['dni'] = 'El DNI debe tener exactamente 8 dígitos';
      return false;
    }
    this.formErrors['dni'] = '';
    return true;
  }

  private validateName(field: 'nombres' | 'apellidos'): boolean {
    const value = this[field];
    if (!value) {
      this.formErrors[field] = `Los ${field} son requeridos`;
      return false;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) {
      this.formErrors[field] = `Los ${field} solo pueden contener letras`;
      return false;
    }
    this.formErrors[field] = '';
    return true;
  }

  private validateForm(): boolean {
    Object.keys(this.formErrors).forEach(key => this.formErrors[key] = '');
    
    let isValid = true;
    
    if (!this.validateDNI()) isValid = false;
    if (!this.validateName('nombres')) isValid = false;
    if (!this.validateName('apellidos')) isValid = false;
    
    if (!this.direccion) {
      this.formErrors['direccion'] = 'La dirección es requerida';
      isValid = false;
    }
    
    if (!this.telefono) {
      this.formErrors['telefono'] = 'El teléfono es requerido';
      isValid = false;
    }

    return isValid;
  }

  onSubmitPago() {
    if (!this.validateForm()) {
      this.mensajeError = 'Por favor, corrija los errores en el formulario';
      return;
    }

    if (this.metodoPago === 'yape' && !this.numeroOperacion) {
      this.mensajeError = 'Ingrese el número de operación de Yape';
      return;
    }

    const cart = this.carritoService.getCart();
    if (!cart.items || cart.items.length === 0) {
      this.mensajeError = 'El carrito está vacío.';
      return;
    }

    // Obtener userId del localStorage
    const userId = this.authService.getUserId();

    const payload = {
      userId: userId, // ← NUEVO: Enviar el ID del usuario
      cliente: {
        dni: this.dni,
        nombres: this.nombres,
        apellidos: this.apellidos,
        nombre_completo: `${this.nombres} ${this.apellidos}`,
        email: localStorage.getItem('email') || null,
        telefono: this.telefono,
        direccion: this.direccion
      },
      items: cart.items.map(i => ({ 
        producto_id: i.id,
        nombre: i.nombre || 'Producto',
        cantidad: i.cantidad, 
        precio: i.precio 
      })),
      total: this.carritoService.totalPrice(),
      metodoPago: this.metodoPago,
      numeroOperacion: this.numeroOperacion,
      comprobanteUrl: this.comprobanteUrl
    };

    this.isProcessing = true;
    this.mensajeError = '';

    this.http.post<any>('http://localhost:3000/api/pedidos', payload).subscribe({
      next: (resp) => {
        this.mensajeExito = resp.mensaje || 'Compra realizada correctamente.';
        this.orderResult = resp;
        this.orderSnapshot = payload;
        this.carritoService.clear();
        this.isProcessing = false;
      },
      error: (err) => {
        console.error('Error al crear pedido:', err);
        this.isProcessing = false;
        this.mensajeError = err?.error?.mensaje || 'Error al procesar el pago.';
      }
    });
  }

  printVoucher() {
    const html = this.generateVoucherHtml();
    const w = window.open('', '_blank');
    if (!w) {
      this.mensajeError = 'Por favor, permita ventanas emergentes para imprimir';
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 500);
  }

  async downloadVoucher() {
    const html = this.generateVoucherHtml();
    const code = this.orderResult?.codigoSeguimiento || 'pedido';

    // Crear contenedor temporal
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.padding = '20px';
    container.style.background = '#fff';
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      if ((window as any).html2pdf) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });

    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');

      const opt = {
        margin: 10,
        filename: `comprobante_${code}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true 
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await (window as any).html2pdf().set(opt).from(container).save();
    } catch (e) {
      console.error('Error al generar PDF:', e);
      // Fallback: descargar HTML
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante_${code}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      container.remove();
    }
  }

  private generateVoucherHtml(): string {
    const order = this.orderResult || {};
    const snap = this.orderSnapshot || {};
    const cliente = snap.cliente || {};
    const items = (snap.items || []).map((it: any) => `
      <tr>
        <td>${it.nombre || 'Producto'}</td>
        <td style="text-align:center">${it.cantidad}</td>
        <td style="text-align:right">S/ ${Number(it.precio).toFixed(2)}</td>
        <td style="text-align:right">S/ ${(it.precio * it.cantidad).toFixed(2)}</td>
      </tr>
    `).join('');

    const fecha = new Date().toLocaleString('es-PE');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Comprobante ${order.codigoSeguimiento || ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              color: #333;
              background: white;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 3px solid #007bff;
              padding-bottom: 20px;
            }
            .header h1 { 
              font-size: 28px; 
              color: #007bff;
              margin-bottom: 10px;
            }
            .header h2 {
              font-size: 20px;
              margin: 10px 0;
            }
            .info-section {
              margin: 20px 0;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .info-section strong {
              display: inline-block;
              width: 120px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px 8px;
              text-align: left;
            }
            th { 
              background: #007bff;
              color: white;
              font-weight: bold;
            }
            .total-section {
              margin-top: 20px;
              text-align: right;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .total-section .total {
              font-size: 24px;
              font-weight: bold;
              color: #28a745;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛍️ TIENDA DE ROPA</h1>
            <h2>Comprobante de Pedido</h2>
            <p><strong>Código:</strong> ${order.codigoSeguimiento || ''}</p>
            <p><small>${fecha}</small></p>
          </div>

          <div class="info-section">
            <p><strong>Cliente:</strong> ${cliente.nombre_completo || ''}</p>
            <p><strong>DNI:</strong> ${cliente.dni || ''}</p>
            <p><strong>Teléfono:</strong> ${cliente.telefono || ''}</p>
            <p><strong>Dirección:</strong> ${cliente.direccion || ''}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align:center; width:80px;">Cant.</th>
                <th style="text-align:right; width:100px;">P.Unit</th>
                <th style="text-align:right; width:100px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items}
            </tbody>
          </table>

          <div class="total-section">
            <p class="total">TOTAL: S/ ${Number(snap.total || 0).toFixed(2)}</p>
          </div>

          <div style="margin-top: 40px; text-align: center; color: #666;">
            <p>Gracias por tu compra</p>
            <p><small>www.tiendaropa.com</small></p>
          </div>
        </body>
      </html>
    `;
  }

  volverAProductos() {
    this.router.navigate(['/productos']);
  }
}