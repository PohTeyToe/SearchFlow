{% test referential_integrity(model, column_name, to, field) %}

select {{ column_name }}
from {{ model }}
where {{ column_name }} not in (
    select {{ field }}
    from {{ to }}
)
and {{ column_name }} is not null

{% endtest %}
