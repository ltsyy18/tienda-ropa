import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login';
import { RegistroComponent } from './pages/auth/registro/registro';
import { ProductosComponent } from './pages/productos/productos';
import { CheckoutComponent } from './pages/checkout-component/checkout-component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'productos',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Iniciar Sesión | FashionStyle'
  },
  {
    path: 'registro',
    component: RegistroComponent,
    title: 'Crear Cuenta | FashionStyle'
  },
  {
    path: 'productos',
    component: ProductosComponent,
    title: 'Tienda | FashionStyle'
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    title: 'Pago | FashionStyle'
  },
  {
    path: '**',
    redirectTo: 'productos',
    pathMatch: 'full'
  }
];
