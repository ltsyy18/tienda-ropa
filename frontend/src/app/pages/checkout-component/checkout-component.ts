import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito-service';

@Component({
  selector: 'app-checkout-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout-component.html',
  styleUrls: ['./checkout-component.css'],
})
export class CheckoutComponent {
  mensajeExito: string = '';

  constructor(
    private router: Router,
    public carritoService: CarritoService
  ) {}

  onSubmitPago() {
    this.carritoService.clear();
    this.mensajeExito = '¡Gracias por su compra!';
    setTimeout(() => {
      this.router.navigate(['/productos']);
    }, 2000);
  }
}
// (Constructor duplicado eliminado)
