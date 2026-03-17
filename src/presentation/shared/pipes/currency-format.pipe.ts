import { Pipe, PipeTransform } from '@angular/core';
import { Currency } from '../../../domain/models/invoice.model';

@Pipe({ name: 'currencyFormat', standalone: true })
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number, currency: Currency): string {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(value);
    }
    // LBP — format as plain number with LL suffix
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value) + ' LL';
  }
}
