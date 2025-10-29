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
  const code = this.orderResult?.codigoSeguimiento || 'pedido';
  
  const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });

  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    
    const jsPDF = (window as any).jspdf.jsPDF;
    const doc = new jsPDF();

    const snap = this.orderSnapshot || {};
    const order = this.orderResult || {};
    const cliente = snap.cliente || {};
    const items = snap.items || [];

    // ==========================================
    // ENCABEZADO
    // ==========================================
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(' FashionStyle', 105, 20, { align: 'center' });
    
    // Línea decorativa
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);

    doc.setFontSize(16);
    doc.setFont(undefined, 'normal');
    doc.text('Comprobante de Pedido', 105, 35, { align: 'center' });

    // Código y fecha
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Código: ${order.codigoSeguimiento || 'N/A'}`, 105, 43, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Fecha: ${new Date().toLocaleString('es-PE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 105, 49, { align: 'center' });

    // ==========================================
    // DATOS DEL CLIENTE
    // ==========================================
    let y = 60;
    
    // Borde de la sección
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(20, y, 170, 30);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('DATOS DEL CLIENTE', 22, y + 6);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Cliente: ${cliente.nombre_completo || 'N/A'}`, 22, y + 13);
    doc.text(`DNI: ${cliente.dni || 'N/A'}`, 22, y + 19);
    doc.text(`Teléfono: ${cliente.telefono || 'N/A'}`, 110, y + 13);
    doc.text(`Dirección: ${cliente.direccion || 'N/A'}`, 22, y + 25);

    // ==========================================
    // TABLA DE PRODUCTOS
    // ==========================================
    y = 95;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('DETALLE DE PRODUCTOS', 22, y);
    
    y += 5;
    
    // Encabezados de la tabla
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, 170, 8, 'F');
    doc.rect(20, y, 170, 8, 'S'); // Borde
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    
    // Encabezados centrados correctamente
    doc.text('Producto', 22, y + 5.5);
    doc.text('Cantidad', 120, y + 5.5, { align: 'center' });
    doc.text('P. Unitario', 152, y + 5.5, { align: 'center' });
    doc.text('Subtotal', 180, y + 5.5, { align: 'center' });
    
    y += 8;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    // Items de la tabla
    let totalGeneral = 0;
    items.forEach((item: any, index: number) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      
      const nombre = item.nombre || 'Producto';
      const cantidad = item.cantidad;
      const precio = Number(item.precio);
      const subtotal = precio * cantidad;
      totalGeneral += subtotal;

      // Fila con borde
      doc.rect(20, y, 170, 7, 'S');

      const nombreCorto = nombre.length > 40 ? nombre.substring(0, 37) + '...' : nombre;
      
      doc.text(nombreCorto, 22, y + 4.5);
      doc.text(cantidad.toString(), 120, y + 4.5, { align: 'center' });
      doc.text(`S/ ${precio.toFixed(2)}`, 152, y + 4.5, { align: 'center' });
      doc.text(`S/ ${subtotal.toFixed(2)}`, 180, y + 4.5, { align: 'center' });
      
      y += 7;
    });

    // ==========================================
    // TOTAL 
    // ==========================================
    y += 8;
    
    // Recuadro del total
    doc.setLineWidth(0.5);
    doc.rect(130, y - 5, 60, 10, 'S');
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: S/ ${Number(snap.total || 0).toFixed(2)}`, 160, y + 2, { align: 'center' });

    // ==========================================
    // FOOTER
    // ==========================================
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    const footerY = 275;
    doc.text('¡Gracias por tu compra!', 105, footerY, { align: 'center' });
    doc.setFontSize(8);
    doc.text('www.fashionstyle.com | contacto@fashionstyle.com', 105, footerY + 5, { align: 'center' });

    // ==========================================
    // GUARDAR PDF
    // ==========================================
    doc.save(`comprobante_${code}.pdf`);
    
    this.mensajeExito = '¡Comprobante PDF descargado correctamente! ✅';
    
    setTimeout(() => {
      this.mensajeExito = '';
    }, 3000);
    
  } catch (error) {
    console.error('Error al generar PDF:', error);
    this.mensajeError = 'Error al generar el PDF. Por favor, intenta imprimir el comprobante.';
    
    setTimeout(() => {
      this.mensajeError = '';
    }, 5000);
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