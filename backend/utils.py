def normalize_unit(quantity: float, unit: str):
    """
    Normalizes quantity to standard units (kg or L).
    Returns (normalized_quantity, standard_unit).
    """
    unit = unit.lower().strip()
    
    # Mass
    if unit in ['g', 'gram', 'grams']:
        return quantity / 1000.0, 'kg'
    elif unit in ['kg', 'kilogram', 'kilograms']:
        return quantity, 'kg'
    elif unit in ['oz', 'ounce', 'ounces']:
        # Rough estimation for mass oz to kg? Or fluid?
        # User said "groceries", usually solid or liquid.
        # Let's assume fluid oz if it's a liquid, but oz can be mass.
        # Context matters. For now, let's treat oz as mass approx 28.35g
        return (quantity * 28.3495) / 1000.0, 'kg'
    elif unit in ['lb', 'lbs', 'pound', 'pounds']:
        return quantity * 0.453592, 'kg'
        
    # Volume
    elif unit in ['ml', 'milliliter', 'milliliters']:
        return quantity / 1000.0, 'L'
    elif unit in ['l', 'liter', 'liters']:
        return quantity, 'L'
    elif unit in ['fl oz', 'fluid oz']:
        return quantity * 0.0295735, 'L'
        
    # Default/Unknown
    return quantity, unit

def calculate_unit_price(price: float, quantity: float, unit: str):
    norm_qty, std_unit = normalize_unit(quantity, unit)
    if norm_qty == 0:
        return 0.0, std_unit, 0.0
    
    unit_price = price / norm_qty
    return unit_price, std_unit, norm_qty
