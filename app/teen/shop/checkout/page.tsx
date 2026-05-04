'use client'

import { HybridCheckout } from '@/components/payment/hybrid-checkout'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const router = useRouter()
  
  // Mock data for demo
  const mockItem = {
    name: "Place de Cinéma VIP",
    price: 150.00,
    userXP: 5000
  }

  const handleConfirm = (xpUsed: number, cashAmount: number) => {
    toast.success('Paiement simulé avec succès !', {
      description: `XP: ${xpUsed} | Cash: ${cashAmount.toFixed(2)} DH`
    })
    setTimeout(() => router.push('/teen/shop'), 2000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-black text-foreground mb-2">Checkout</h1>
          <p className="text-muted-foreground">Finalise ta commande pour</p>
          <p className="text-primary font-bold text-lg">{mockItem.name}</p>
        </div>

        <HybridCheckout 
          totalAmount={mockItem.price} 
          userXP={mockItem.userXP} 
          onConfirm={handleConfirm}
        />
        
        <button 
          onClick={() => router.back()}
          className="w-full text-muted-foreground text-sm hover:text-foreground transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

