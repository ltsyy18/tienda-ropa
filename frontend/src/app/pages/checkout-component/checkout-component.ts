import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito-service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-checkout-component',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './checkout-component.html',
  styleUrls: ['./checkout-component.css'],
})
export class CheckoutComponent {
  mensajeExito: string = '';
  mensajeError: string = '';
  isProcessing: boolean = false;

  nombre: string = '';
  direccion: string = '';
  telefono: string = '';
  metodoPago: string = 'yape';
  numeroOperacion: string = '';
  comprobanteUrl: string = '';
  selectedFile: File | null = null;
  orderResult: any = null;
  orderSnapshot: any = null;

  private qrImageUrl: string = 'assets/qr-yape.svg';
  private logoUrl: string = 'assets/logo.svg';
  private qrError: boolean = false;
  private fallbackQrSvg: string = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="100%" height="100%" fill="#f8f9fa"/>
      <text x="100" y="90" text-anchor="middle" font-family="Arial" font-size="14">
        QR Yape
      </text>
      <text x="100" y="110" text-anchor="middle" font-family="Arial" font-size="12">
        (Vista previa)
      </text>
    </svg>
  `;

  constructor(
    private router: Router,
    public carritoService: CarritoService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    // Intentar precargar la imagen del QR
    const img = new Image();
    img.onerror = () => {
      console.warn('QR image not found, using embedded SVG');
      this.qrError = true;
    };
    img.src = this.qrImageUrl;
  }

  getQRUrl(): SafeUrl {
    if (this.qrError) {
      const encoded = btoa(this.fallbackQrSvg);
      return this.sanitizer.bypassSecurityTrustUrl('data:image/svg+xml;base64,' + encoded);
    }
    return this.sanitizer.bypassSecurityTrustUrl(this.qrImageUrl);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      // Subir imagen y obtener URL
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

  onSubmitPago() {
    // Validación rápida
    if (!this.nombre || !this.direccion || !this.telefono) {
      this.mensajeError = 'Complete todos los campos obligatorios.';
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

    const payload = {
      cliente: {
        nombre: this.nombre,
        email: localStorage.getItem('email') || null,
        telefono: this.telefono,
        direccion: this.direccion
      },
      // incluimos nombre para mostrar en el comprobante
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
        // Guardamos snapshot para el comprobante
        this.orderResult = resp;
        this.orderSnapshot = payload;
        // Limpiamos carrito pero mantenemos snapshot
        this.carritoService.clear();
        this.isProcessing = false;
        // No navegamos automáticamente para dar opción de imprimir/descargar
      },
      error: (err) => {
        console.error('Error al crear pedido:', err);
        this.isProcessing = false;
        this.mensajeError = err?.error?.mensaje || 'Error al procesar el pago.';
      }
    });
  }

  private formatCurrency(v: any) {
    const n = Number(v);
    if (!isFinite(n)) return '0.00';
    return n.toFixed(2);
  }

  private generateVoucherHtml(): string {
    const order = this.orderResult || {};
    const snap = this.orderSnapshot || {};
    const items = (snap.items || []).map((it: any) => `
      <tr>
        <td>${it.nombre || 'Producto'}</td>
        <td style="text-align:center">${it.cantidad}</td>
        <td style="text-align:right">S/ ${this.formatCurrency(it.precio)}</td>
        <td style="text-align:right">S/ ${this.formatCurrency(it.precio * it.cantidad)}</td>
      </tr>
    `).join('\n');

    const svgLogo = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60">
        <style>.text { font-family: Arial, sans-serif; font-weight: bold; }</style>
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text x="100" y="35" class="text" font-size="24" text-anchor="middle" fill="#333">
          TIENDA DE ROPA
        </text>
        <rect x="30" y="40" width="140" height="2" fill="#007bff"/>
      </svg>
    `;

    const fecha = new Date().toLocaleString();

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Comprobante Pedido ${order.codigoSeguimiento || ''}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #333 }
            .header { text-align: center; margin-bottom: 20px }
            .logo { font-size: 18px; font-weight: bold }
            table { width: 100%; border-collapse: collapse; margin-top: 10px }
            th, td { border: 1px solid #ddd; padding: 8px }
            th { background: #f8f8f8 }
            .right { text-align: right }
            .totals { margin-top: 12px; float: right; width: 300px }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="max-width: 200px; margin: 0 auto;">
              ${svgLogo}
            </div>
            <div style="margin-top: 1rem; text-align: center;">
              <h2 style="margin: 0.5rem 0; color: #333;">Comprobante de pedido</h2>
              <div><strong>Código de pedido:</strong> ${order.codigoSeguimiento || order.pedidoId || ''}</div>
              <div style="color: #666;"><small>${fecha}</small></div>
            </div>
          </div>

          <div>
            <strong>Cliente:</strong> ${snap.cliente?.nombre || ''}<br>
            <strong>Teléfono:</strong> ${snap.cliente?.telefono || ''}<br>
            <strong>Dirección:</strong> ${snap.cliente?.direccion || ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align:center">Cant.</th>
                <th style="text-align:right">P.Unit</th>
                <th style="text-align:right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items}
            </tbody>
          </table>

          <div class="totals">
            <div><strong>Total:</strong> S/ ${this.formatCurrency(snap.total || 0)}</div>
          </div>

        </body>
      </html>
    `;

    return html;
  }

  printVoucher() {
    const html = this.generateVoucherHtml();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    // Esperar un poco para que renderice antes de imprimir
    setTimeout(() => {
      w.print();
    }, 500);
  }

  async downloadVoucher() {
    const html = this.generateVoucherHtml();
    const code = this.orderResult?.codigoSeguimiento || this.orderResult?.pedidoId || 'pedido';

    // Crear contenedor oculto con el HTML del comprobante
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.boxSizing = 'border-box';
    container.style.padding = '10px';
    container.style.background = '#fff';
    container.style.color = '#333';
    container.innerHTML = html;
    // Evitar mostrar en pantalla
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      if ((window as any).html2pdf) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });

    try {
      // Cargamos html2pdf (incluye html2canvas + jsPDF) desde CDN
      await loadScript('https://unpkg.com/html2pdf.js@0.9.3/dist/html2pdf.bundle.min.js');

      const opt = {
        margin: 10,
        filename: `comprobante_${code}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await (window as any).html2pdf().set(opt).from(container).save();
    } catch (e) {
      console.error('Error generando PDF:', e);
      this.mensajeError = 'Error al generar PDF. Se descargará el HTML como alternativa.';
      // Fallback: descarga HTML
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

  volverAProductos() {
    this.router.navigate(['/productos']);
  }
}
