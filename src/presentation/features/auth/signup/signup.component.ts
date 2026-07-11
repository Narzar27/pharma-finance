import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { SignupBusinessUseCase } from '../../../../application/use-cases/tenants/signup-business.use-case';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './signup.component.html',
})
export class SignupComponent {
  private auth = inject(AuthService);
  private signupBusiness = inject(SignupBusinessUseCase);
  private router = inject(Router);
  theme = inject(ThemeService);

  businessName = '';
  firstName = '';
  lastName = '';
  dob = '';
  email = '';
  password = '';

  loading = signal(false);
  error = signal('');

  async onSubmit() {
    if (!this.businessName || !this.firstName || !this.lastName || !this.dob || !this.email || !this.password) {
      this.error.set('Please fill in every field.');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    const today = new Date();
    const dobDate = new Date(this.dob);
    if (isNaN(dobDate.getTime()) || dobDate > today) {
      this.error.set('Please enter a valid date of birth.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const { error: signUpError } = await this.auth.signUp(this.email, this.password);
    if (signUpError) {
      this.loading.set(false);
      if (signUpError.message.toLowerCase().includes('already registered')) {
        this.error.set('An account with this email already exists. Log in instead.');
      } else {
        this.error.set(signUpError.message);
      }
      return;
    }

    try {
      await this.signupBusiness.execute({
        businessName: this.businessName,
        firstName: this.firstName,
        lastName: this.lastName,
        dob: this.dob,
      });
      this.router.navigate(['/pending']);
    } catch {
      this.error.set('We created your login but hit a problem setting up your business — please try logging in, or contact us if it happens again.');
    } finally {
      this.loading.set(false);
    }
  }
}
