#!/usr/bin/env python3
"""
ETI Educom - Payment Data Audit & Fix Script
=============================================

This script audits and optionally fixes payment data discrepancies:
1. Enrollment total_paid doesn't match sum of payments
2. Enrollment payment_status is incorrect
3. Installment status doesn't match actual payments
4. Installment paid_amount is incorrect

Usage:
    # Audit only (no changes)
    python payment_audit.py --audit
    
    # Audit and fix issues
    python payment_audit.py --fix
    
    # Connect to specific MongoDB
    python payment_audit.py --audit --mongo-url "mongodb://localhost:27017" --db-name "crm_db"
"""

import asyncio
import argparse
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Default MongoDB settings
DEFAULT_MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DEFAULT_DB_NAME = os.environ.get('DB_NAME', 'crm_db')


async def run_audit(mongo_url: str, db_name: str, fix_issues: bool = False):
    """Run payment data audit and optionally fix issues"""
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 80)
    print("ETI EDUCOM - PAYMENT DATA AUDIT REPORT")
    print(f"Database: {db_name}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Mode: {'AUDIT + FIX' if fix_issues else 'AUDIT ONLY'}")
    print("=" * 80)
    
    # Statistics
    total_enrollments = 0
    enrollments_with_issues = 0
    issues_fixed = 0
    
    # Detailed issues
    all_issues = []
    
    # Get all enrollments
    enrollments = await db.enrollments.find({}, {"_id": 0}).to_list(None)
    total_enrollments = len(enrollments)
    
    print(f"\nScanning {total_enrollments} enrollments...\n")
    
    for enrollment in enrollments:
        enrollment_id = enrollment.get('id')
        student_name = enrollment.get('student_name', 'Unknown')
        final_fee = enrollment.get('final_fee', 0) or 0
        stored_total_paid = enrollment.get('total_paid', 0) or 0
        stored_status = enrollment.get('payment_status', 'Pending')
        
        enrollment_issues = []
        fixes_applied = []
        
        # ===== AUDIT 1: Total Paid Mismatch =====
        payments = await db.payments.find(
            {"enrollment_id": enrollment_id}, 
            {"_id": 0, "amount": 1, "installment_number": 1, "payment_plan_id": 1}
        ).to_list(None)
        
        actual_total_paid = sum(p.get('amount', 0) or 0 for p in payments)
        
        if abs(stored_total_paid - actual_total_paid) > 1:  # 1 rupee tolerance
            enrollment_issues.append({
                "type": "TOTAL_PAID_MISMATCH",
                "description": f"Stored: ₹{stored_total_paid}, Actual: ₹{actual_total_paid}",
                "stored": stored_total_paid,
                "actual": actual_total_paid
            })
            
            if fix_issues:
                await db.enrollments.update_one(
                    {"id": enrollment_id},
                    {"$set": {"total_paid": actual_total_paid}}
                )
                fixes_applied.append(f"Updated total_paid to ₹{actual_total_paid}")
                issues_fixed += 1
        
        # ===== AUDIT 2: Payment Status Incorrect =====
        expected_status = "Paid" if actual_total_paid >= final_fee else (
            "Partial" if actual_total_paid > 0 else "Pending"
        )
        
        if stored_status != expected_status and final_fee > 0:
            enrollment_issues.append({
                "type": "STATUS_INCORRECT",
                "description": f"Stored: '{stored_status}', Expected: '{expected_status}'",
                "stored": stored_status,
                "expected": expected_status
            })
            
            if fix_issues:
                await db.enrollments.update_one(
                    {"id": enrollment_id},
                    {"$set": {"payment_status": expected_status}}
                )
                fixes_applied.append(f"Updated payment_status to '{expected_status}'")
                issues_fixed += 1
        
        # ===== AUDIT 3: Installment Status Issues =====
        payment_plan = await db.payment_plans.find_one(
            {"enrollment_id": enrollment_id}, 
            {"_id": 0}
        )
        
        if payment_plan:
            plan_id = payment_plan.get('id')
            installments = await db.installment_schedule.find(
                {"payment_plan_id": plan_id}, 
                {"_id": 0}
            ).to_list(None)
            
            for inst in installments:
                inst_id = inst.get('id')
                inst_num = inst.get('installment_number')
                inst_amount = inst.get('amount', 0) or 0
                inst_status = inst.get('status', 'Pending')
                stored_paid_amount = inst.get('paid_amount', 0) or 0
                
                # Find payments for this specific installment
                inst_payments = [
                    p for p in payments 
                    if p.get('installment_number') == inst_num and p.get('payment_plan_id') == plan_id
                ]
                actual_inst_paid = sum(p.get('amount', 0) or 0 for p in inst_payments)
                
                # Check: Marked Paid but no payment found
                if inst_status == 'Paid' and actual_inst_paid == 0:
                    enrollment_issues.append({
                        "type": "INSTALLMENT_STATUS_ERROR",
                        "description": f"Installment #{inst_num}: Marked 'Paid' but no payment found",
                        "installment_number": inst_num
                    })
                    
                    if fix_issues:
                        await db.installment_schedule.update_one(
                            {"id": inst_id},
                            {"$set": {"status": "Pending", "paid_amount": 0, "paid_date": None}}
                        )
                        fixes_applied.append(f"Reset installment #{inst_num} to 'Pending'")
                        issues_fixed += 1
                
                # Check: Has sufficient payment but not marked Paid
                elif inst_status != 'Paid' and actual_inst_paid >= inst_amount and inst_amount > 0:
                    enrollment_issues.append({
                        "type": "INSTALLMENT_NOT_MARKED_PAID",
                        "description": f"Installment #{inst_num}: Paid ₹{actual_inst_paid} >= ₹{inst_amount} but status is '{inst_status}'",
                        "installment_number": inst_num
                    })
                    
                    if fix_issues:
                        # Find the payment date
                        payment_dates = [p.get('payment_date') for p in inst_payments if p.get('payment_date')]
                        paid_date = max(payment_dates) if payment_dates else datetime.now(timezone.utc).isoformat()
                        
                        await db.installment_schedule.update_one(
                            {"id": inst_id},
                            {"$set": {"status": "Paid", "paid_amount": actual_inst_paid, "paid_date": paid_date}}
                        )
                        fixes_applied.append(f"Marked installment #{inst_num} as 'Paid'")
                        issues_fixed += 1
                
                # Check: paid_amount doesn't match actual payment
                elif inst_status == 'Paid' and abs(stored_paid_amount - actual_inst_paid) > 1:
                    enrollment_issues.append({
                        "type": "PAID_AMOUNT_MISMATCH",
                        "description": f"Installment #{inst_num}: Stored paid_amount ₹{stored_paid_amount} != Actual ₹{actual_inst_paid}",
                        "installment_number": inst_num
                    })
                    
                    if fix_issues:
                        await db.installment_schedule.update_one(
                            {"id": inst_id},
                            {"$set": {"paid_amount": actual_inst_paid}}
                        )
                        fixes_applied.append(f"Updated installment #{inst_num} paid_amount to ₹{actual_inst_paid}")
                        issues_fixed += 1
        
        # Record issues for this enrollment
        if enrollment_issues:
            enrollments_with_issues += 1
            all_issues.append({
                "student_name": student_name,
                "enrollment_id": enrollment_id,
                "final_fee": final_fee,
                "stored_total_paid": stored_total_paid,
                "actual_total_paid": actual_total_paid,
                "issues": enrollment_issues,
                "fixes_applied": fixes_applied
            })
    
    # ===== PRINT REPORT =====
    print("\n" + "=" * 80)
    print("AUDIT SUMMARY")
    print("=" * 80)
    print(f"Total Enrollments Scanned: {total_enrollments}")
    print(f"Enrollments with Issues: {enrollments_with_issues}")
    if fix_issues:
        print(f"Total Issues Fixed: {issues_fixed}")
    print()
    
    if all_issues:
        print("\n" + "-" * 80)
        print("DETAILED ISSUES")
        print("-" * 80)
        
        for idx, item in enumerate(all_issues[:50], 1):  # Show first 50
            print(f"\n{idx}. {item['student_name']}")
            print(f"   Enrollment ID: {item['enrollment_id']}")
            print(f"   Final Fee: ₹{item['final_fee']}")
            print(f"   Stored Paid: ₹{item['stored_total_paid']} | Actual Paid: ₹{item['actual_total_paid']}")
            
            print("   Issues:")
            for issue in item['issues']:
                print(f"      ⚠️  [{issue['type']}] {issue['description']}")
            
            if item['fixes_applied']:
                print("   Fixes Applied:")
                for fix in item['fixes_applied']:
                    print(f"      ✅ {fix}")
        
        if len(all_issues) > 50:
            print(f"\n   ... and {len(all_issues) - 50} more enrollments with issues")
    else:
        print("\n✅ No payment discrepancies found! All data is consistent.")
    
    print("\n" + "=" * 80)
    print("END OF REPORT")
    print("=" * 80)
    
    client.close()
    
    return {
        "total_enrollments": total_enrollments,
        "enrollments_with_issues": enrollments_with_issues,
        "issues_fixed": issues_fixed if fix_issues else 0,
        "all_issues": all_issues
    }


async def recalculate_all_totals(mongo_url: str, db_name: str):
    """Recalculate total_paid and payment_status for all enrollments"""
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 80)
    print("RECALCULATING ALL ENROLLMENT PAYMENT TOTALS")
    print("=" * 80)
    
    enrollments = await db.enrollments.find({}, {"_id": 0, "id": 1, "final_fee": 1, "student_name": 1}).to_list(None)
    
    updated_count = 0
    
    for enrollment in enrollments:
        enrollment_id = enrollment.get('id')
        final_fee = enrollment.get('final_fee', 0) or 0
        
        # Calculate actual total from payments
        payments = await db.payments.find(
            {"enrollment_id": enrollment_id}, 
            {"_id": 0, "amount": 1}
        ).to_list(None)
        
        actual_total = sum(p.get('amount', 0) or 0 for p in payments)
        
        # Determine correct status
        status = "Paid" if actual_total >= final_fee else (
            "Partial" if actual_total > 0 else "Pending"
        )
        
        # Update enrollment
        await db.enrollments.update_one(
            {"id": enrollment_id},
            {"$set": {
                "total_paid": actual_total,
                "payment_status": status
            }}
        )
        updated_count += 1
        
        if updated_count % 100 == 0:
            print(f"   Processed {updated_count} enrollments...")
    
    print(f"\n✅ Updated {updated_count} enrollments")
    client.close()


def main():
    parser = argparse.ArgumentParser(
        description="ETI Educom Payment Data Audit & Fix Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Audit only (safe, no changes)
    python payment_audit.py --audit
    
    # Audit and fix all issues
    python payment_audit.py --fix
    
    # Recalculate all enrollment payment totals
    python payment_audit.py --recalculate
    
    # Use custom MongoDB connection
    python payment_audit.py --audit --mongo-url "mongodb+srv://user:pass@cluster.mongodb.net" --db-name "production_db"
        """
    )
    
    parser.add_argument('--audit', action='store_true', help='Run audit only (no changes)')
    parser.add_argument('--fix', action='store_true', help='Run audit and fix issues')
    parser.add_argument('--recalculate', action='store_true', help='Recalculate all payment totals')
    parser.add_argument('--mongo-url', default=DEFAULT_MONGO_URL, help='MongoDB connection URL')
    parser.add_argument('--db-name', default=DEFAULT_DB_NAME, help='Database name')
    
    args = parser.parse_args()
    
    if not any([args.audit, args.fix, args.recalculate]):
        parser.print_help()
        return
    
    if args.recalculate:
        asyncio.run(recalculate_all_totals(args.mongo_url, args.db_name))
    else:
        asyncio.run(run_audit(args.mongo_url, args.db_name, fix_issues=args.fix))


if __name__ == "__main__":
    main()
