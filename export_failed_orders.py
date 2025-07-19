import psycopg2
import pandas as pd
import os
import sys
import traceback
from datetime import datetime

# Force output to be unbuffered
sys.stdout.reconfigure(line_buffering=True)

# Database connection string and settings
DATABASE_URL = "postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway"
CONNECTION_TIMEOUT = 10  # seconds

print("Script starting...")

def get_order_details(order_id):
    """Get detailed information about a specific order"""
    try:
        print(f"===== CHECKING ORDER {order_id} =====")
        
        # Connect to the database with timeout
        print("Connecting to the database...")
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=CONNECTION_TIMEOUT)
        cursor = conn.cursor()
        
        # Test the connection
        cursor.execute('SELECT 1')
        cursor.fetchone()
        print("Database connection successful!")
        
        # Get all tables
        print("Fetching database tables...")
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
        tables = [table[0] for table in cursor.fetchall()]
        print(f"Tables in database: {', '.join(tables)}")
        
        # Find tables related to orders
        order_tables = [t for t in tables if 'order' in t.lower()]
        print(f"Order-related tables: {', '.join(order_tables)}")
        
        if not order_tables:
            print("No order-related tables found!")
            return
        
        # Use the first order-related table found
        orders_table = order_tables[0]
        print(f"Using table: {orders_table}")
        
        # List columns in the order table
        print(f"Fetching columns for table {orders_table}...")
        cursor.execute(f"""
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '{orders_table}' 
        ORDER BY ordinal_position
        """)
        columns = [col[0] for col in cursor.fetchall()]
        print(f"Columns in {orders_table}: {', '.join(columns)}")
        
        # Find the order by its ID
        query = f"""
        SELECT * FROM \"{orders_table}\" 
        WHERE external_id = %s OR id = %s
        """
        
        print(f"Searching for order {order_id}...")
        cursor.execute(query, (order_id, order_id))
        
        # Get column names from the query result
        column_names = [desc[0] for desc in cursor.description]
        
        # Fetch the order
        order = cursor.fetchone()
        
        if not order:
            print(f"Order {order_id} not found!")
            return
        
        # Create a dictionary with order details
        order_details = dict(zip(column_names, order))
        
        print("\n===== ORDER DETAILS =====")
        for key, value in order_details.items():
            print(f"{key}: {value}")
        
        # Check for related tables that might have more information
        related_tables = [
            t for t in tables 
            if any(x in t.lower() for x in ['order_log', 'order_history', 'order_status', 'order_error'])
        ]
        
        print("\n===== CHECKING RELATED TABLES =====")
        for table in related_tables:
            print(f"\nChecking table: {table}")
            
            # Get columns for this table
            cursor.execute(f"""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{table}' 
            ORDER BY ordinal_position
            """)
            table_columns = [col[0] for col in cursor.fetchall()]
            
            # Find order reference column
            order_ref_cols = [col for col in table_columns if 'order' in col.lower() and ('id' in col.lower() or 'external' in col.lower())]
            
            if order_ref_cols:
                order_ref_col = order_ref_cols[0]
                query = f"""
                SELECT * FROM \"{table}\" 
                WHERE \"{order_ref_col}\" = %s
                """
                
                cursor.execute(query, (order_details.get('id', order_id),))
                related_records = cursor.fetchall()
                
                if related_records:
                    print(f"Found {len(related_records)} related records:")
                    for record in related_records:
                        record_dict = dict(zip([desc[0] for desc in cursor.description], record))
                        for key, value in record_dict.items():
                            print(f"{key}: {value}")
                else:
                    print("No related records found.")
        
        # Close database connection
        cursor.close()
        conn.close()
        print("\nDatabase connection closed.")
        
    except Exception as e:
        print("\n===== ERROR =====")
        print(f"An error occurred: {str(e)}")
        print("Traceback:")
        traceback.print_exc()
        print("=================")
        
    except Exception as e:
        print("\n===== ERROR =====")
        print(f"An error occurred: {str(e)}")
        print("Traceback:")
        traceback.print_exc()
        print("=================")

if __name__ == "__main__":
    get_order_details("VP-90b713fd")

