// src/app/features/candidate/wallet/wallet.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'REFUND';
  amount: number;
  description: string;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss']
})
export class WalletComponent implements OnInit {
  balance = 250.00;
  addAmount: number | null = null;
  isAddingMoney = false;
  showAddMoneyForm = false;
  
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  activeFilter: string = 'ALL';
  
  paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: 'credit_card' },
    { id: 'upi', name: 'UPI', icon: 'qr_code_2' },
    { id: 'wallet', name: 'Wallet Transfer', icon: 'account_balance_wallet' }
  ];
  
  selectedPaymentMethod = 'card';

  constructor(
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    // Sample data - replace with actual API call
    this.transactions = [
      {
        id: 'TXN001',
        type: 'DEPOSIT',
        amount: 100,
        description: 'Added money via Credit Card',
        date: '2024-01-15T10:30:00Z',
        status: 'COMPLETED'
      },
      {
        id: 'TXN002',
        type: 'PAYMENT',
        amount: -25,
        description: 'Premium job application fee',
        date: '2024-01-14T14:20:00Z',
        status: 'COMPLETED'
      },
      {
        id: 'TXN003',
        type: 'DEPOSIT',
        amount: 200,
        description: 'Added money via UPI',
        date: '2024-01-10T09:15:00Z',
        status: 'COMPLETED'
      },
      {
        id: 'TXN004',
        type: 'REFUND',
        amount: 15,
        description: 'Refund for cancelled application',
        date: '2024-01-08T16:45:00Z',
        status: 'COMPLETED'
      },
      {
        id: 'TXN005',
        type: 'WITHDRAWAL',
        amount: -40,
        description: 'Withdrawal to bank account',
        date: '2024-01-05T11:00:00Z',
        status: 'PENDING'
      }
    ];
    
    this.filterTransactions('ALL');
  }

  filterTransactions(filter: string): void {
    this.activeFilter = filter;
    
    switch (filter) {
      case 'DEPOSIT':
        this.filteredTransactions = this.transactions.filter(t => t.type === 'DEPOSIT');
        break;
      case 'WITHDRAWAL':
        this.filteredTransactions = this.transactions.filter(t => t.type === 'WITHDRAWAL');
        break;
      case 'PAYMENT':
        this.filteredTransactions = this.transactions.filter(t => t.type === 'PAYMENT');
        break;
      default:
        this.filteredTransactions = [...this.transactions];
    }
  }

  openAddMoneyForm(): void {
    this.showAddMoneyForm = true;
    this.addAmount = null;
  }

  closeAddMoneyForm(): void {
    this.showAddMoneyForm = false;
    this.addAmount = null;
    this.selectedPaymentMethod = 'card';
  }

  addMoney(): void {
    if (!this.addAmount || this.addAmount <= 0) {
      this.toastr.error('Please enter a valid amount');
      return;
    }

    if (this.addAmount < 10) {
      this.toastr.error('Minimum amount to add is ₹10');
      return;
    }

    this.isAddingMoney = true;

    // Simulate API call
    setTimeout(() => {
      this.balance += this.addAmount!;
      
      const newTransaction: Transaction = {
        id: 'TXN' + Date.now(),
        type: 'DEPOSIT',
        amount: this.addAmount!,
        description: `Added money via ${this.getPaymentMethodName()}`,
        date: new Date().toISOString(),
        status: 'COMPLETED'
      };
      
      this.transactions.unshift(newTransaction);
      this.filterTransactions(this.activeFilter);
      
      this.toastr.success(`₹${this.addAmount} added successfully!`);
      this.closeAddMoneyForm();
      this.isAddingMoney = false;
      this.cdr.detectChanges();
    }, 1500);
  }

  getPaymentMethodName(): string {
    const method = this.paymentMethods.find(m => m.id === this.selectedPaymentMethod);
    return method ? method.name : 'Unknown';
  }

  getTransactionIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'DEPOSIT': 'savings',
      'WITHDRAWAL': 'account_balance',
      'PAYMENT': 'credit_card',
      'REFUND': 'undo'
    };
    return icons[type] || 'payments';
  }

  getTransactionColor(type: string): string {
    const colors: { [key: string]: string } = {
      'DEPOSIT': 'deposit',
      'WITHDRAWAL': 'withdrawal',
      'PAYMENT': 'payment',
      'REFUND': 'refund'
    };
    return colors[type] || '';
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'COMPLETED': 'status-completed',
      'PENDING': 'status-pending',
      'FAILED': 'status-failed'
    };
    return classes[status] || '';
  }

  getTotalDeposits(): number {
    return this.transactions
      .filter(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getTotalSpent(): number {
    return Math.abs(this.transactions
      .filter(t => (t.type === 'PAYMENT' || t.type === 'WITHDRAWAL') && t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0));
  }
}
